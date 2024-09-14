const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 3000;

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  database: 'likeme',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json());

pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Database connected successfully:', result.rows[0].now);
  }
});

// Ruta: GET Todos los Posts
app.get('/posts', async (req, res) => {
  try {
    const query = 'SELECT * FROM posts';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ error: 'Failed to retrieve posts' });
  }
});

// Ruta: POST Nuevo Post
app.post('/posts', async (req, res) => {
  const { titulo, img, descripcion, likes } = req.body;
  try {
    const query = 'INSERT INTO posts (titulo, img, descripcion, likes) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [titulo, img, descripcion, likes];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating new post:', error);
    res.status(500).json({ error: 'Failed to create new post' });
  }
});

// Ruta: PUT para agregar o quitar un like
app.put('/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!action || (action !== 'like' && action !== 'unlike')) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  try {
    const result = await pool.query('SELECT likes FROM posts WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    let likes = result.rows[0].likes;

    if (action === 'like') {
      likes += 1;
    } else if (action === 'unlike') {
      likes = likes > 0 ? likes - 1 : 0;
    }

    const updateResult = await pool.query(
      'UPDATE posts SET likes = $1 WHERE id = $2 RETURNING *',
      [likes, id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error al actualizar los likes:', error);
    res.status(500).json({ error: 'Error al actualizar los likes' });
  }
});

// Ruta: DELETE Eliminar un Post
app.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM posts WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    res.json({ message: 'Post eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando el post:', error);
    res.status(500).json({ error: 'Error al eliminar el post' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
