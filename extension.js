const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Groq = require("groq-sdk");

let groq;


 function activate(context) {
	console.log('Codetribute is now active!');

	//VS Code command that creates a GitHub repository using the GitHub API and Axios.
	const createRepoDisposable = vscode.commands.registerCommand('codetribute.createRepo', async () => { //registers a new command which will be available in the vscode command palette 
		try{
			console.log('Creating a new repository...');
			const session = await vscode.authentication.getSession('github', ['repo'],{createIfNone: true}); //requests an authentication session from Github using the vscode Authentication API. The scope [repo] allows access to private and public repositories
			if (!session) {
                vscode.window.showErrorMessage('GitHub authentication failed!');
                return;
            }
            
            const token = session.accessToken; //extracts the access token from the session

			const response = await axios.post('https://api.github.com/user/repos', { //sends a POST request to the GitHub API to create a new repository
				name: `codetribute-repo`, //generates a unique repository name with a timestamp
				private: true
				}, {
				headers: {
					Authorization: `token ${token}`,  //Sends the github OAuth token in the header for authorization
                    Accept: 'application/vnd.github.v3+json' //specifies the version of the GitHub API to use
                }
			});

			if(response.status === 201){ //if the repository is successfully created
				vscode.window.showInformationMessage('Repository created successfully!'); 
				console.log('Repository created successfully!');
			}else{
				vscode.window.showErrorMessage('Failed to create repository!'); 
				console.error('Github API response: ',response.status,response.data);
			}

		}catch(error){
			if(error instanceof Error){// ensures that the error is an instance of JavaScript's built-in Error object
				vscode.window.showErrorMessage(`Error: ${error.message}`); 
			}else{
				vscode.window.showErrorMessage('An unknown error occurred!');
			}
		}
	});

	context.subscriptions.push(createRepoDisposable); //adds the command to the subscriptions array and cleaned up when the extension is deactivated

	//Detect Workspace folder and set log file path
	const workspaceFolders = vscode.workspace.workspaceFolders; //Retrieves an array of workspace folders currently open in VS Code.

	if(!workspaceFolders){
		vscode.window.showErrorMessage('No workspace folder detected! Please open a workspace folder to use Codetribute.'); 
		console.error('No workspace folder detected!');
		return;
	}

	const logPath = path.join(workspaceFolders[0].uri.fsPath, 'log.txt');
	console.log('Log file path: ', logPath);

	//ensure if log file exists
	try{
		if(!fs.existsSync(logPath)){
			fs.writeFileSync(logPath,''); //creates a new log file if it does not exist
			console.log('Log file created successfully!', logPath);
		}
		else{
			console.log('Log file already exists!'); 
		}
	}catch(error){
		console.error('Error creating log file: ', error);
	}

	const storedApiKey = context.globalState.get('groqApiKey'); //retrieves the stored API key from the global state
	if(storedApiKey){
		groq =new Groq({apiKey: storedApiKey}); //initializes the Groq SDK with the stored API key
		console.log('Groq SDK initialized with stored API key!');
	}else{
		vscode.window.showInputBox({
			prompt:'Please Enter your Groq API key to use Summarization features',
			ignoreFocusOut: true,
			password: true,
		}).then(apiKey=>{
			if(apiKey){
				context.globalState.update('groqApiKey', apiKey); //stores the API key in the global state
				groq = new Groq({apiKey}); //initializes the Groq SDK with the entered API key
				vscode.window.showInformationMessage('Groq API Key saved successfully!');
				console.log('Groq SDK initialized with entered API key!');
			}else{
				vscode.window.showErrorMessage('Groq API Key is required to use Summarization features!');
			}
		});
	}

	//File Watcher to monitor eveery file change in the workspace
	const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*',false,false,false); //creates a new file system watcher that monitors all files in the workspace
	let fileActivities = []; //stores file activity logs in an array

	fileWatcher.onDidCreate(async uri => {
        const filePath = uri.fsPath;
        const activity = {
            action: 'created',
            folder: path.basename(path.dirname(filePath)), //extracts the parent folder
            fileName: path.basename(filePath), //extracts the file name
            content: await readFileContent(filePath) //calls the readFileContent function to read the file content upto 500 characters
        };
        console.log(activity);
        fileActivities.push(activity);
    });

    fileWatcher.onDidChange(async uri => {
        const filePath = uri.fsPath;
        const activity = {
            action: 'modified',
            folder: path.basename(path.dirname(filePath)),
            fileName: path.basename(filePath),
            content: await readFileContent(filePath)
        };
        console.log(activity);
        fileActivities.push(activity);
    });

    fileWatcher.onDidDelete(uri => { //not async because we don't need to read the content of the deleted file
        const filePath = uri.fsPath;
        const activity = {
            action: 'deleted',
            folder: path.basename(path.dirname(filePath)),
            fileName: path.basename(filePath)
        };
        console.log(activity);
        fileActivities.push(activity);
    });
	context.subscriptions.push(fileWatcher); //adds the file watcher to the subscriptions array and cleaned up when the extension is deactivated

	const readFileContent = async (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return content.length > 500 ? content.substring(0, 500) + '...' : content;
            }
        } catch (err) {
            console.error(`Error reading file content for ${filePath}:`, err);
        }
        return undefined;
    };//reads the first 500 character of a file content

	//Generate a summary of all file activities
	const generateWorkLog = async (fileActivities) => {
        console.log('Generating work log...');
        
        const modifiedFiles = Array.from(new Set(fileActivities.filter(a => a.action === 'modified').map(a => a.fileName))); //filters the file activities array to get only modified files and then extracts the file names
        const createdFiles = Array.from(new Set(fileActivities.filter(a => a.action === 'created').map(a => a.fileName))); 
        const deletedFiles = Array.from(new Set(fileActivities.filter(a => a.action === 'deleted').map(a => a.fileName)));
    
        const formattedTime = new Date().toLocaleString();
    
        let workLog = `===============================
        Work log generated at ${formattedTime}:
        \n\nModified Files: ${JSON.stringify(modifiedFiles)}
        Created Files: ${JSON.stringify(createdFiles)}
        Deleted Files: ${JSON.stringify(deletedFiles)}
        ===============================`;
    
        return workLog;
    };

	 // Summarize file activities using Groq
	 const summarizeWorkLog = async (fileActivities) => {
        console.log('Summarizing work log using Groq...');

        try {
            if (!groq) {
                throw new Error('Groq instance is not initialized.');
            }

            const detailedLog = fileActivities.map(a => { //loops through each file actitvity object
                const contentSnippet = a.content ? `\nContent: ${a.content}` : ''; 
                return `${a.action.toUpperCase()} ${a.folder}/${a.fileName}${contentSnippet}`;//converts actions to uppercase and combines folder and filename to show the complete path
            }).join('\n');

            const response = await groq.chat.completions.create({ //response from the Groq API
                messages: [
                    {
                        role: "user",
                        content: `Summarize the following work activities concisely without providing suggestions, recommendations, or additional information:
						${detailedLog}`
                    }
                ],
                model: "llama-3.2-3b-preview"
            });

            const summary = response.choices[0]?.message?.content || 'Summary could not be generated.';
            console.log('Summary generated:', summary);
            return summary;
        } catch (err) {
            console.error('Error summarizing work log:', err);
            return 'Error generating summary.';
        }
    };

	  // Append log data to the log.txt file
	  const appendLogToFile = async (log) => {
        try {
            console.log('Appending to log file:', log);
            fs.appendFileSync(logPath, `${log}\n\n`);
            console.log('Log file updated successfully.');
        } catch (err) {
            console.error('Error writing to log file:', err);
        }
    };

	// Push logs to the GitHub repository
    const pushLogsToGitHub = async () => {
        try {
            console.log('Pushing logs to GitHub...');
            const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
            if (!session) {
                vscode.window.showErrorMessage('GitHub authentication failed!');
                return;
            }

            const token = session.accessToken;

            // Read log file content and encode it
            const content = Buffer.from(fs.readFileSync(logPath)).toString('base64');

            // Always fetch the latest SHA before updating the file
            let sha;
            try {
                const response = await axios.get(
                    `https://api.github.com/repos/${session.account.label}/codetribute-repo/contents/log.txt`,
                    {
                        headers: {
                            Authorization: `token ${token}`,
                        },
                    }
                );
                sha = response.data.sha;
                console.log('Fetched existing file SHA:', sha);
            } catch (err) {
                if (axios.isAxiosError(err) && err.response && err.response.status === 404) {
                    console.log('File does not exist in the repository. Creating a new file.');
                    sha = undefined;
                } else {
                    console.error('Error checking file existence:', err);
                    throw err;
                }
            }

            // Upload or update the log file
            await axios.put(
                `https://api.github.com/repos/${session.account.label}/codetribute-repo/contents/log.txt`,
                {
                    message: 'Update log.txt',
                    content,
                    sha,
                },
                {
                    headers: {
                        Authorization: `token ${token}`,
                    },
                }
            );

            vscode.window.showInformationMessage('Logs pushed to GitHub successfully!');
            console.log('Logs pushed to GitHub successfully!');
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error pushing logs to GitHub: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred while pushing logs to GitHub.');
            }
            console.error('Error pushing logs to GitHub:', error);
        }
    };

    // Periodically update the log file and push to GitHub
    const intervalMinutes = 60;
    setInterval(async () => {
        if (fileActivities.length > 0) {
            console.log('Updating logs...');
            const log = await generateWorkLog(fileActivities);
            const summary = await summarizeWorkLog(fileActivities);
            const combinedLog = `${log}\n\nSummary:\n${summary}`;
            await appendLogToFile(combinedLog);
            await pushLogsToGitHub();
            fileActivities = [];
        }
    }, intervalMinutes * 60 * 1000);

}

 function deactivate(){
	console.log('Codetribute is now deactivated!');
}
exports.activate = activate;
exports.deactivate = deactivate;