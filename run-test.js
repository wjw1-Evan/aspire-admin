const { execSync } = require('child_process');
try {
    const res = execSync('node test-workflows.js', { encoding: 'utf-8' });
    console.log(res);
} catch (e) {
    console.error(e.stdout);
    console.error(e.stderr);
}
