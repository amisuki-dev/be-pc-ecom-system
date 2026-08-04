const fs = require('fs');

let content = fs.readFileSync('package.json', 'utf8');
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\n/m, '');
content = content.replace(/>>>>>>> origin\/main\n/m, '');
fs.writeFileSync('package.json', content);

let content2 = fs.readFileSync('src/productspecs/productspecs.service.spec.ts', 'utf8');
content2 = content2.replace(/<<<<<<< HEAD[\s\S]*?=======\n/m, '');
content2 = content2.replace(/>>>>>>> origin\/main\n/m, '');
fs.writeFileSync('src/productspecs/productspecs.service.spec.ts', content2);
