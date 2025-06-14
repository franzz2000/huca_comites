const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const db = new sqlite3.Database('./data/grupos.db', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
    }
});

// Crear usuario de prueba si no existe
const createTestUser = () => {
    db.get('SELECT COUNT(*) as count FROM personas', [], (err, row) => {
        if (err) {
            console.error('Error al verificar usuarios existentes:', err);
            return;
        }
        
        if (row.count === 0) {
            console.log('No hay usuarios en la base de datos. Creando usuario de prueba...');
            db.run(
                'INSERT INTO personas (nombre, primer_apellido, segundo_apellido, email, telefono, puesto_trabajo, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    'Usuario', 
                    'de Prueba', 
                    'Ejemplo', 
                    'test@example.com',
                    '600123456',
                    'Desarrollador',
                    'Usuario de prueba creado automáticamente'
                ],
                function(err) {
                    if (err) {
                        console.error('Error al crear usuario de prueba:', err);
                    } else {
                        console.log('Usuario de prueba creado con ID:', this.lastID);
                    }
                }
            );
        }
    });
};

// Crear tablas
const createTables = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS grupos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT
        );

        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            primer_apellido TEXT NOT NULL,
            segundo_apellido TEXT,
            email TEXT UNIQUE NOT NULL,
            telefono TEXT,
            puesto_trabajo TEXT,
            observaciones TEXT
        );

        CREATE TABLE IF NOT EXISTS miembros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER,
            grupo_id INTEGER,
            fecha_inicio DATE,
            fecha_fin DATE,
            FOREIGN KEY (persona_id) REFERENCES personas(id),
            FOREIGN KEY (grupo_id) REFERENCES grupos(id)
        );

        CREATE TABLE IF NOT EXISTS reuniones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grupo_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            ubicacion TEXT NOT NULL,
            descripcion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS asistencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reunion_id INTEGER NOT NULL,
            persona_id INTEGER NOT NULL,
            estado TEXT NOT NULL CHECK(estado IN ('asistio', 'no_asistio', 'excusa')),
            observaciones TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reunion_id) REFERENCES reuniones(id) ON DELETE CASCADE,
            FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
            UNIQUE(reunion_id, persona_id)
        );
        
        -- Actualizar la tabla de reuniones si ya existe
        PRAGMA table_info(reuniones);
        PRAGMA table_info(asistencias);
    `);
};

// Rutas API
app.get('/api/grupos', (req, res) => {
    db.all('SELECT * FROM grupos', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/grupos', (req, res) => {
    console.log('Solicitud recibida:', req.body);
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
        console.error('Error: Nombre es requerido');
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    db.run('INSERT INTO grupos (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion || null],
        function(err) {
            if (err) {
                console.error('Error en la consulta SQL:', err);
                return res.status(500).json({ 
                    error: 'Error al crear el grupo',
                    details: err.message 
                });
            }
            console.log('Grupo creado con ID:', this.lastID);
            res.status(201).json({ 
                id: this.lastID,
                nombre,
                descripcion: descripcion || null
            });
        }
    );
});

// Actualizar un grupo
app.put('/api/grupos/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    db.run('UPDATE grupos SET nombre = ?, descripcion = ? WHERE id = ?',
        [nombre, descripcion || null, id],
        function(err) {
            if (err) {
                console.error('Error al actualizar el grupo:', err);
                return res.status(500).json({ 
                    error: 'Error al actualizar el grupo',
                    details: err.message 
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Grupo no encontrado' });
            }
            
            console.log(`Grupo con ID ${id} actualizado`);
            res.status(200).json({ 
                id: parseInt(id),
                nombre,
                descripcion: descripcion || null
            });
        }
    );
});

// Eliminar un grupo
app.delete('/api/grupos/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM grupos WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error al eliminar el grupo:', err);
            return res.status(500).json({ 
                error: 'Error al eliminar el grupo',
                details: err.message 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }
        
        console.log(`Grupo con ID ${id} eliminado`);
        res.status(200).json({ message: 'Grupo eliminado correctamente' });
    });
});

// Obtener todos los usuarios
app.get('/api/usuarios', (req, res) => {
    db.all('SELECT * FROM personas', [], (err, rows) => {
        if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).json({ error: 'Error al obtener los usuarios', details: err.message });
        }
        res.json(rows);
    });
});

// Obtener un usuario por ID
app.get('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM personas WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error al obtener usuario:', err);
            return res.status(500).json({ error: 'Error al obtener el usuario', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(row);
    });
});

// Crear un nuevo usuario
app.post('/api/usuarios', (req, res) => {
    const { 
        nombre, 
        primer_apellido, 
        segundo_apellido, 
        email, 
        telefono, 
        puesto_trabajo, 
        observaciones 
    } = req.body;
    
    if (!nombre || !primer_apellido || !email) {
        return res.status(400).json({ 
            error: 'Nombre, primer apellido y email son campos requeridos' 
        });
    }
    
    db.run(
        'INSERT INTO personas (nombre, primer_apellido, segundo_apellido, email, telefono, puesto_trabajo, observaciones) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            nombre, 
            primer_apellido, 
            segundo_apellido || null, 
            email,
            telefono || null,
            puesto_trabajo || null,
            observaciones || null
        ],
        function(err) {
            if (err) {
                console.error('Error al crear usuario:', err);
                return res.status(500).json({ 
                    error: 'Error al crear el usuario',
                    details: err.message 
                });
            }
            
            // Devolver el usuario creado con todos sus campos
            db.get('SELECT * FROM personas WHERE id = ?', [this.lastID], (err, row) => {
                if (err || !row) {
                    return res.status(201).json({ 
                        id: this.lastID,
                        nombre,
                        primer_apellido,
                        segundo_apellido: segundo_apellido || null,
                        email,
                        telefono: telefono || null,
                        puesto_trabajo: puesto_trabajo || null,
                        observaciones: observaciones || null
                    });
                }
                res.status(201).json(row);
            });
        }
    );
});

// Actualizar un usuario
app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { 
        nombre, 
        primer_apellido, 
        segundo_apellido, 
        email, 
        telefono, 
        puesto_trabajo, 
        observaciones 
    } = req.body;
    
    if (!nombre || !primer_apellido || !email) {
        return res.status(400).json({ 
            error: 'Nombre, primer apellido y email son campos requeridos' 
        });
    }
    
    const updateQuery = `
        UPDATE personas 
        SET nombre = ?, 
            primer_apellido = ?, 
            segundo_apellido = ?, 
            email = ?, 
            telefono = ?, 
            puesto_trabajo = ?, 
            observaciones = ? 
        WHERE id = ?
    `;
    
    db.run(
        updateQuery,
        [
            nombre,
            primer_apellido,
            segundo_apellido || null,
            email,
            telefono || null,
            puesto_trabajo || null,
            observaciones || null,
            id
        ],
        function(err) {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                return res.status(500).json({ 
                    error: 'Error al actualizar el usuario',
                    details: err.message 
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            // Devolver el usuario actualizado con todos sus campos
            db.get('SELECT * FROM personas WHERE id = ?', [id], (err, row) => {
                if (err || !row) {
                    return res.json({
                        id: parseInt(id),
                        nombre,
                        primer_apellido,
                        segundo_apellido: segundo_apellido || null,
                        email,
                        telefono: telefono || null,
                        puesto_trabajo: puesto_trabajo || null,
                        observaciones: observaciones || null
                    });
                }
                res.json(row);
            });
        }
    );
});

// Eliminar un usuario
app.delete('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM personas WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error al eliminar usuario:', err);
            return res.status(500).json({ 
                error: 'Error al eliminar el usuario',
                details: err.message 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    });
});

// Obtener miembros de un grupo
app.get('/api/miembros', (req, res) => {
    const { grupoId } = req.query;
    let query = 'SELECT m.*, p.nombre as persona_nombre, p.primer_apellido, p.segundo_apellido, p.email as persona_email, p.telefono, p.puesto_trabajo, p.observaciones FROM miembros m ' +
                'JOIN personas p ON m.persona_id = p.id';
    const params = [];
    
    if (grupoId) {
        query += ' WHERE m.grupo_id = ?';
        params.push(grupoId);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error al obtener miembros:', err);
            return res.status(500).json({ error: 'Error al obtener los miembros', details: err.message });
        }
        
        const miembros = rows.map(row => ({
            id: row.id,
            persona_id: row.persona_id,
            grupo_id: row.grupo_id,
            fecha_inicio: row.fecha_inicio,
            fecha_fin: row.fecha_fin,
            persona: {
                id: row.persona_id,
                nombre: row.persona_nombre,
                primer_apellido: row.primer_apellido,
                segundo_apellido: row.segundo_apellido,
                email: row.persona_email,
                telefono: row.telefono,
                puesto_trabajo: row.puesto_trabajo,
                observaciones: row.observaciones
            }
        }));
        
        res.json(miembros);
    });
});

// Agregar un miembro a un grupo
app.post('/api/miembros', (req, res) => {
    const { persona_id, grupo_id, fecha_inicio, fecha_fin } = req.body;
    
    if (!persona_id || !grupo_id) {
        return res.status(400).json({ error: 'ID de persona y grupo son requeridos' });
    }
    
    db.run('INSERT INTO miembros (persona_id, grupo_id, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
        [persona_id, grupo_id, fecha_inicio || new Date().toISOString().split('T')[0], fecha_fin || null],
        async function(err) {
            if (err) {
                console.error('Error al agregar miembro:', err);
                return res.status(500).json({ 
                    error: 'Error al agregar el miembro',
                    details: err.message 
                });
            }
            
            // Obtener los datos completos del miembro
            db.get(
                'SELECT m.*, p.nombre as persona_nombre, p.email as persona_email ' +
                'FROM miembros m JOIN personas p ON m.persona_id = p.id WHERE m.id = ?',
                [this.lastID],
                (err, row) => {
                    if (err || !row) {
                        return res.status(201).json({
                            id: this.lastID,
                            persona_id,
                            grupo_id,
                            fecha_inicio,
                            fecha_fin
                        });
                    }
                    
                    res.status(201).json({
                        id: row.id,
                        persona_id: row.persona_id,
                        grupo_id: row.grupo_id,
                        fecha_inicio: row.fecha_inicio,
                        fecha_fin: row.fecha_fin,
                        persona: {
                            id: row.persona_id,
                            nombre: row.persona_nombre,
                            email: row.persona_email
                        }
                    });
                }
            );
        }
    );
});

// Eliminar un miembro de un grupo
app.delete('/api/miembros/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM miembros WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error al eliminar miembro:', err);
            return res.status(500).json({ 
                error: 'Error al eliminar el miembro',
                details: err.message 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }
        
        res.status(200).json({ message: 'Miembro eliminado correctamente' });
    });
});

// Aplicar el middleware a la ruta de reuniones
app.post('/api/reuniones', (req, res) => {
    console.log('\n=== INICIO DE SOLICITUD DE REUNIÓN ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw request body:', req.rawBody || 'No raw body');
    console.log('Parsed body:', req.body);
    
    try {
        // Usar el body ya parseado por nuestro middleware
        const requestBody = req.body;
        console.log('Parsed request body:', JSON.stringify(requestBody, null, 2));
        
        if (!requestBody) {
            console.error('No se recibieron datos en el cuerpo de la petición');
            return res.status(400).json({
                error: 'No se recibieron datos en el cuerpo de la petición',
                details: 'El cuerpo de la petición está vacío o no es un JSON válido'
            });
        }
        
        const { grupo_id, fecha, hora, ubicacion, descripcion } = requestBody;
        
        console.log('Extracted fields:', {
            grupo_id,
            fecha,
            hora,
            ubicacion,
            descripcion
        });
        
        // Validate required fields
        const missingFields = [];
        if (typeof grupo_id === 'undefined') missingFields.push('grupo_id');
        if (typeof fecha === 'undefined') missingFields.push('fecha');
        if (typeof hora === 'undefined') missingFields.push('hora');
        if (typeof ubicacion === 'undefined') missingFields.push('ubicacion');
        
        if (missingFields.length > 0) {
            const errorMsg = `Faltan campos requeridos: ${missingFields.join(', ')}`;
            console.error(errorMsg, { grupo_id, fecha, hora, ubicacion });
            return res.status(400).json({ 
                error: errorMsg,
                required: ['grupo_id', 'fecha', 'hora', 'ubicacion'],
                received: { grupo_id, fecha, hora, ubicacion },
                missing: missingFields
            });
        }
        
        console.log('Datos validados correctamente');
        
        // Verificar que la tabla existe y tiene las columnas correctas
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='reuniones'", [], (err, row) => {
            if (err) {
                console.error('Error al verificar la tabla reuniones:', err);
                return res.status(500).json({ 
                    error: 'Error interno del servidor',
                    details: err.message
                });
            }
                
            if (!row) {
                const errorMsg = 'La tabla reuniones no existe en la base de datos';
                console.error(errorMsg);
                return res.status(500).json({ 
                    error: errorMsg,
                    type: 'database_error',
                    details: 'La tabla de reuniones no está creada en la base de datos'
                });
            }
            
            // Insertar la reunión
            const sql = 'INSERT INTO reuniones (grupo_id, fecha, hora, ubicacion, descripcion) VALUES (?, ?, ?, ?, ?)';
            const params = [grupo_id, fecha, hora, ubicacion, descripcion || null];
            
            console.log('Ejecutando consulta SQL:', sql, 'con parámetros:', params);
            
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Error al insertar la reunión:', {
                        message: err.message,
                        code: err.code,
                        stack: err.stack,
                        sql: sql,
                        params: params
                    });
                    
                    // Verificar si el error es por restricción de clave foránea
                    if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('FOREIGN KEY')) {
                        return res.status(400).json({
                            error: 'Error de integridad de datos',
                            details: 'El grupo especificado no existe o no es válido',
                            code: 'INVALID_GROUP'
                        });
                    }
                    
                    return res.status(500).json({ 
                        error: 'Error al crear la reunión',
                        details: err.message,
                        code: err.code || 'DATABASE_ERROR'
                    });
                }
                
                const newReunionId = this.lastID;
                console.log('Reunión creada con éxito. ID:', newReunionId);
                
                // Obtener la reunión recién creada para devolverla
                db.get('SELECT * FROM reuniones WHERE id = ?', [newReunionId], (err, reunion) => {
                    if (err) {
                        console.error('Error al obtener la reunión recién creada:', err);
                        // Aún así devolvemos éxito, pero con datos parciales
                        return res.status(201).json({
                            id: newReunionId,
                            grupo_id,
                            fecha,
                            hora,
                            ubicacion,
                            descripcion: descripcion || null
                        });
                    }
                    
                    console.log('Reunión creada:', reunion);
                    res.status(201).json(reunion);
                });
            });
        });
    } catch (error) {
        console.error('Error inesperado en el servidor:', {
            message: error.message,
            stack: error.stack,
            raw: error
        });
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message,
            type: 'unexpected_error'
        });
    } finally {
        console.log('=== FIN DE SOLICITUD DE REUNIÓN ===\n');
    }
});

app.post('/api/reuniones/:reunionId/asistencia', (req, res) => {
    const { reunionId } = req.params;
    const { persona_id, asistio } = req.body;
    
    db.run('INSERT INTO asistencia (reunion_id, persona_id, asistio) VALUES (?, ?, ?)',
        [reunionId, persona_id, asistio],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Endpoints para reuniones
app.get('/api/reuniones', (req, res) => {
    try {
        console.log('Solicitud recibida en /api/reuniones con query:', req.query);
        const { grupoId } = req.query;
        let query = 'SELECT * FROM reuniones';
        const params = [];
        
        if (grupoId) {
            console.log('Filtrando por grupoId:', grupoId);
            query += ' WHERE grupo_id = ?';
            params.push(grupoId);
        }
        
        query += ' ORDER BY fecha DESC, hora DESC';
        console.log('Ejecutando consulta SQL:', query, 'con parámetros:', params);
        
        db.all(query, params, async (err, reuniones) => {
            if (err) {
                console.error('Error en la consulta SQL:', err);
                return res.status(500).json({ 
                    error: 'Error al obtener las reuniones',
                    details: err.message 
                });
            }
            
            // Obtener asistencias para cada reunión
            const reunionesConAsistencias = await Promise.all(reuniones.map(async (reunion) => {
                return new Promise((resolve, reject) => {
                    db.all(
                        `SELECT a.*, p.nombre, p.primer_apellido, p.segundo_apellido 
                         FROM asistencias a
                         JOIN personas p ON a.persona_id = p.id
                         WHERE a.reunion_id = ?`, 
                        [reunion.id],
                        (err, asistencias) => {
                            if (err) {
                                console.error('Error al obtener asistencias para la reunión', reunion.id, ':', err);
                                // Si hay un error, devolver la reunión sin asistencias
                                resolve({ ...reunion, asistencias: [] });
                            } else {
                                resolve({ ...reunion, asistencias });
                            }
                        }
                    );
                });
            }));
            
            console.log('Reuniones con asistencias:', reunionesConAsistencias);
            res.json(reunionesConAsistencias);
        });
    } catch (error) {
        console.error('Error inesperado en /api/reuniones:', error);
        res.status(500).json({ 
            error: 'Error inesperado al procesar la solicitud',
            details: error.message 
        });
    }
});


app.get('/api/reuniones/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM reuniones WHERE id = ?', [id], (err, reunion) => {
        if (err) {
            console.error('Error al obtener la reunión:', err);
            return res.status(500).json({ error: 'Error al obtener la reunión' });
        }
        
        if (!reunion) {
            return res.status(404).json({ error: 'Reunión no encontrada' });
        }
        
        // Obtener las asistencias de la reunión
        db.all(`
            SELECT a.*, p.nombre, p.primer_apellido, p.segundo_apellido 
            FROM asistencias a
            JOIN personas p ON a.persona_id = p.id
            WHERE a.reunion_id = ?
        `, [id], (err, asistencias) => {
            if (err) {
                console.error('Error al obtener las asistencias:', err);
                return res.status(500).json({ error: 'Error al obtener las asistencias' });
            }
            
            res.json({
                ...reunion,
                asistencias
            });
        });
    });
});

app.put('/api/reuniones/:id', (req, res) => {
    const { id } = req.params;
    const { fecha, hora, ubicacion, descripcion } = req.body;
    
    const query = `
        UPDATE reuniones 
        SET fecha = ?, hora = ?, ubicacion = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    db.run(query, [fecha, hora, ubicacion, descripcion || null, id], function(err) {
        if (err) {
            console.error('Error al actualizar la reunión:', err);
            return res.status(500).json({ error: 'Error al actualizar la reunión' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Reunión no encontrada' });
        }
        
        db.get('SELECT * FROM reuniones WHERE id = ?', [id], (err, reunion) => {
            if (err) {
                console.error('Error al obtener la reunión actualizada:', err);
                return res.status(500).json({ error: 'Error al obtener la reunión actualizada' });
            }
            res.json(reunion);
        });
    });
});

app.delete('/api/reuniones/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM reuniones WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error al eliminar la reunión:', err);
            return res.status(500).json({ error: 'Error al eliminar la reunión' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Reunión no encontrada' });
        }
        
        res.status(204).send();
    });
});

app.post('/api/reuniones/:id/asistencias', (req, res) => {
    const { id: reunion_id } = req.params;
    const { asistencias } = req.body;
    
    if (!Array.isArray(asistencias)) {
        return res.status(400).json({ error: 'Se esperaba un arreglo de asistencias' });
    }
    
    // Iniciar una transacción
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
            INSERT INTO asistencias (reunion_id, persona_id, estado, observaciones)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(reunion_id, persona_id) 
            DO UPDATE SET 
                estado = excluded.estado,
                observaciones = excluded.observaciones,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        asistencias.forEach(({ persona_id, estado, observaciones }) => {
            stmt.run([reunion_id, persona_id, estado, observaciones || null], (err) => {
                if (err) {
                    console.error('Error al guardar la asistencia:', err);
                    return db.run('ROLLBACK', () => {
                        res.status(500).json({ error: 'Error al guardar las asistencias' });
                    });
                }
            });
        });
        
        stmt.finalize(() => {
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error al hacer commit de la transacción:', err);
                    return res.status(500).json({ error: 'Error al guardar las asistencias' });
                }
                
                // Devolver las asistencias actualizadas
                db.all(`
                    SELECT a.*, p.nombre, p.primer_apellido, p.segundo_apellido 
                    FROM asistencias a
                    JOIN personas p ON a.persona_id = p.id
                    WHERE a.reunion_id = ?
                `, [reunion_id], (err, asistenciasActualizadas) => {
                    if (err) {
                        console.error('Error al obtener las asistencias actualizadas:', err);
                        return res.status(500).json({ error: 'Error al obtener las asistencias actualizadas' });
                    }
                    
                    res.json(asistenciasActualizadas);
                });
            });
        });
    });
});

// Inicializar la base de datos y comenzar el servidor
const PORT = process.env.PORT || 3001;

createTables();
createTestUser();

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
