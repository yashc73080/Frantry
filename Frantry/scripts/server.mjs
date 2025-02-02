import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

app.get('/', (req, res) => {
  res.send('Hello, welcome to the Frantry API!');
});

// Add a GET route for /image so it doesn’t 404:
app.get('/image', (req, res) => {
  res.send('Use POST /image to upload an image.');
});

app.post('/image', (req, res) => {
  console.log('Received image:', req.body.image?.slice(0, 100), '...');
  res.json({ success: true });
});

app.listen(5000, '10.74.126.23', () => { // TODO change this
  console.log('Server running on http://10.74.126.23:5000');
});