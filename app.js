// --- CONFIGURACIÓN INICIAL ---
let atletas = JSON.parse(localStorage.getItem('movemetrics_atletas')) || [];
let atletaActual = null;

// --- NAVEGACIÓN ---
function showPage(pageId) {
    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Quitar clase activa de los botones del menú
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    // Mostrar la página seleccionada
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.remove('hidden');
        console.log("Navegando a: " + pageId);
    }
}

// --- GESTIÓN DE ATLETAS ---
function prepNewAtleta() {
    showPage('page-nuevo-atleta');
}

function guardarAtleta() {
    const nombre = document.getElementById('new-nombre').value;
    const deporte = document.getElementById('new-deporte').value;

    if (!nombre) return alert("Por favor, ingresá el nombre.");

    const nuevoAtleta = {
        id: Date.now(),
        nombre: nombre,
        deporte: deporte,
        evaluaciones: {
            dolor: []
        }
    };

    atletas.push(nuevoAtleta);
    localStorage.setItem('movemetrics_atletas', JSON.stringify(atletas));
    alert("Atleta guardado con éxito");
    renderAtletas();
    showPage('page-inicio');
}

function renderAtletas() {
    const contenedor = document.getElementById('atleta-list');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    atletas.forEach(atleta => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${atleta.nombre}</h3>
            <p>${atleta.deporte}</p>
            <button class="btn btn-full mt-12" onclick="seleccionarAtleta(${atleta.id})">Ver Perfil</button>
        `;
        contenedor.appendChild(card);
    });
}

function seleccionarAtleta(id) {
    atletaActual = atletas.find(a => a.id === id);
    alert("Atleta seleccionado: " + atletaActual.nombre);
}

// --- BODY CHART (LÓGICA INICIAL) ---
// Esta función simula el clic en el cuerpo humano
function marcarDolor(zona) {
    if (!atletaActual) return alert("Primero seleccioná un atleta en el Dashboard");
    
    const intensidad = prompt(`Intensidad de dolor en ${zona} (0-10):`, "0");
    if (intensidad !== null) {
        atletaActual.evaluaciones.dolor.push({
            zona: zona,
            intensidad: intensidad,
            fecha: new Date().toLocaleDateString()
        });
        localStorage.setItem('movemetrics_atletas', JSON.stringify(atletas));
        alert("Dolor registrado en " + zona);
    }
}

// --- INICIALIZAR APP AL CARGAR ---
document.addEventListener('DOMContentLoaded', () => {
    renderAtletas();
    showPage('page-inicio'); // Esto hace que la app no arranque en blanco
});
