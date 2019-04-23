# folder-schema
generate and validate folder schema

## Install

```
yarn add folder-schema
npm i --save folder-schema
```

## Usage

**parse(folderpath: string)**

```javascript
const FolderSchema = require('folder-schema');

const schema = await FolderSchema.parse('./node_modules');

console.log(schema.toJSON());
```