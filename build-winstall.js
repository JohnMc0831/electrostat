var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: '/release',
    outputDirectory: '/release/installer64',
    authors: 'UVMMC IT DevOps Team',
    exe: 'electroStat 1.0.0.exe'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));