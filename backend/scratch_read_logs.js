const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\tuank\\.gemini\\antigravity-ide\\brain\\d9e0b261-fb13-43ff-9960-3bdc13743bcd\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  const matches = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj).toLowerCase();
      if (str.includes('applications') && (str.includes('400') || str.includes('error') || str.includes('fail'))) {
        matches.push({ lineNum: index + 1, type: obj.type, content: obj.content ? obj.content.substring(0, 300) : '' });
      }
    } catch (e) {
      // ignore parse error
    }
  });

  console.log(`Found ${matches.length} matching entries:`);
  console.log(JSON.stringify(matches.slice(-10), null, 2)); // show last 10 matches
} catch (err) {
  console.error('Error reading log file:', err);
}
