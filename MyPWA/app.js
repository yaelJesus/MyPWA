if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.log('Error al registrar el Service Worker:', error);
            });
    });
}

initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}` }).then(SQL => {
    const db = new SQL.Database();

    db.run("CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY, nombre TEXT, precio REAL);");
    db.run("INSERT INTO productos (nombre, precio) VALUES ('Zombicide 2nd Edition', 2438.11), ('The Binding of Isaac: Four Souls', 2452.52), ('Al Chile', 740.0), ('No Lo Testeamos Ni Un Poco', 314.64), ('No Lo Testeamos Ni Un Poco: Picante', 314.64), ('Ryker - Compatible con Here to Slay', 523.24), ('Ryker - Compatible con Unstable Unicors', 582.40);");

    guardarBaseDeDatos(db);
    cargarBaseDeDatos();

    function agregarProducto(nombre, precio, db) {
        db.run(`INSERT INTO productos (nombre, precio) VALUES ('${nombre}', ${precio});`);
        guardarBaseDeDatos(db);
    }

    document.getElementById('agregar').addEventListener('click', () => {
        document.getElementById('form-popup').style.display = 'block';
    });

    document.getElementById('cancelar').addEventListener('click', () => {
        document.getElementById('form-popup').style.display = 'none';
    });

    document.getElementById('guardar').addEventListener('click', () => {
        const nombre = document.getElementById('nombre').value;
        const precio = parseFloat(document.getElementById('precio').value);
        
        if (nombre && !isNaN(precio)) {
            agregarProducto(nombre, precio, db);
            document.getElementById('form-popup').style.display = 'none';
        } else {
            alert('Nombre o precio inválido.');
        }
    });

    mostrarProductos(db);
});

function mostrarProductos(db) {
    const result = db.exec("SELECT * FROM productos;");
    const contentDiv = document.getElementById('content');
    let table = "<table><tr><th>ID</th><th>Nombre</th><th>Precio</th></tr>";
    result[0].values.forEach(row => {
        table += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>$${row[2]}</td></tr>`;
    });
    table += "</table>";
    contentDiv.innerHTML = table;
}

function guardarBaseDeDatos(db) {
    const request = indexedDB.open('WhishListDB', 1);

    request.onupgradeneeded = function(event) {
        const indexedDBInstance  = event.target.result;
        if (!indexedDBInstance .objectStoreNames.contains('productos')) {
            indexedDBInstance .createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
        }
        console.log('IndexedDB: Se creó el store de productos.');
    };

    request.onsuccess = function(event) {
        const indexedDBInstance  = event.target.result;
        const transaction = indexedDBInstance .transaction('productos', 'readwrite');
        const store = transaction.objectStore('productos');

        const productosSQL = db.exec('SELECT * FROM productos;')[0].values;
        console.log('Productos obtenidos de SQL.js:', productosSQL);

        productosSQL.forEach(producto => {
            const [id, nombre, precio] = producto;
            store.put({ id, nombre, precio });
            console.log(`Producto guardado en IndexedDB: ${id}, ${nombre}, ${precio}`);
        });

        transaction.oncomplete = () => {
            console.log('Datos guardados en IndexedDB');
            cargarBaseDeDatos().then(mostrarProductosIndexedDB);
        };

        transaction.onerror = (error) => console.error('Error al guardar datos en IndexedDB:', error);
    };

    request.onerror = function(event) {
        console.error('Error al abrir IndexedDB:', event.target.error);
    };
}

function cargarBaseDeDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WhishListDB', 1);

        request.onsuccess = function(event) {
            const indexedDBInstance = event.target.result;
            const transaction = indexedDBInstance.transaction('productos', 'readonly');
            const store = transaction.objectStore('productos');
            const cursorRequest = store.openCursor();
            const productos = [];

            cursorRequest.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    productos.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(productos);
                }
            };

            cursorRequest.onerror = function(event) {
                reject(event.target.error);
            };
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

function mostrarProductosIndexedDB(productos) {
    const contentDiv = document.getElementById('content');
    let table = "<table><tr><th>ID</th><th>Nombre</th><th>Precio</th></tr>";
    
    productos.forEach(producto => {
        table += `<tr><td>${producto.id}</td><td>${producto.nombre}</td><td>$${producto.precio}</td></tr>`;
    });
    
    table += "</table>";
    contentDiv.innerHTML = table;
}