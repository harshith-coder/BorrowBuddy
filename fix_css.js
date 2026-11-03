const fs = require('fs');
let css = fs.readFileSync('client/src/App.css', 'utf8');

const cutIdx = css.indexOf('@media (max-width: 640px) {');
const cleanPrefix = css.substring(0, cutIdx);

const originalMedia = `@media (max-width: 640px) {
  .signup-modal {
    flex-direction: column;
    max-height: 95vh;
    overflow-y: auto;
  }

  .signup-left {
    width: 100%;
    padding: 28px 24px;
  }

  .signup-right {
    padding: 28px 24px;
  }

  .signup-categories {
    justify-content: center;
  }

  .login-options {
    flex-wrap: wrap;
    gap: 8px;
  }
}
`;

const idx = css.indexOf('.create-group-container {');
let newClasses = css.substring(idx);
const tailMarker = '\n  }\n\n  .signup-left {';
if (newClasses.includes(tailMarker)) {
  newClasses = newClasses.substring(0, newClasses.indexOf(tailMarker));
}

const finalCss = cleanPrefix + originalMedia + '\n' + newClasses.trim() + '\n';
fs.writeFileSync('client/src/App.css', finalCss, 'utf8');
console.log('Cleaned App.css successfully');

