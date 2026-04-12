import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('API OK'));
app.listen(3001, () => console.log('Test server on 3001'));
