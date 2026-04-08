const fs = require('fs');
const path = require('path');
const glob = require('glob');

const appNameJsx = '{import.meta.env.VITE_APP_NAME || "Clinic Management System"}';
const appNameString = '`${import.meta.env.VITE_APP_NAME || "Clinic Management System"}`';

const filePatterns = [
  'src/Pages/**/*.jsx',
  'src/components/**/*.jsx'
];

let filesToProcess = [];
filePatterns.forEach(pattern => {
  const matched = glob.sync(path.join(__dirname, pattern));
  filesToProcess.push(...matched);
});

filesToProcess.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replacements in JSX text nodes
  content = content.replace(/>([^<]*)Slotify Professional([^<]*)</g, (match, p1, p2) => {
    return `>${p1}${appNameJsx}${p2}<`;
  });
  
  content = content.replace(/>([^<]*)Slotify Health([^<]*)</g, (match, p1, p2) => {
    return `>${p1}${appNameJsx}${p2}<`;
  });

  content = content.replace(/>([^<]*)Slotify AI([^<]*)</g, (match, p1, p2) => {
    return `>${p1}${appNameJsx} AI${p2}<`;
  });

  content = content.replace(/>([^<]*)Slotify([^<]*)</g, (match, p1, p2) => {
    if (p1.includes('import') || p1.includes('src=')) return match; // rudimentary skip
    return `>${p1}${appNameJsx}${p2}<`;
  });

  // Specifically target alt text
  content = content.replace(/alt="Slotify Logo"/g, 'alt={`${import.meta.env.VITE_APP_NAME || "Clinic"} Logo`}');
  content = content.replace(/name: 'Slotify'/g, 'name: import.meta.env.VITE_APP_NAME || "Clinic"');
  
  // Specific prop replacements for Features pages (desc="...Slotify...")
  content = content.replace(/desc="([^"]*)Slotify([^"]*)"/g, (match, p1, p2) => {
    return `desc={\`${p1}\${import.meta.env.VITE_APP_NAME || "Clinic Management System"}${p2}\`}`;
  });
  
  content = content.replace(/aiHighlight="([^"]*)Slotify([^"]*)"/g, (match, p1, p2) => {
    return `aiHighlight={\`${p1}\${import.meta.env.VITE_APP_NAME || "Clinic Management System"}${p2}\`}`;
  });
  
  content = content.replace(/title="([^"]*)Slotify([^"]*)"/g, (match, p1, p2) => {
    return `title={\`${p1}\${import.meta.env.VITE_APP_NAME || "Clinic Management System"}${p2}\`}`;
  });
  
  content = content.replace(/description="([^"]*)Slotify([^"]*)"/g, (match, p1, p2) => {
    return `description={\`${p1}\${import.meta.env.VITE_APP_NAME || "Clinic Management System"}${p2}\`}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated branding in ${path.relative(__dirname, filePath)}`);
  }
});
