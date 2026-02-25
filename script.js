/* script.js */
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPyPDyOqjYsx0BUJU-y1YHMUR0_uZ2YtiYVclhVI0D_Ruc9nJ_82S1Q5megNOU2wv9Jyj-oRo3gzxm/pub?gid=0&single=true&output=csv'; // Link to google docs data

let projectData = [];

async function init() {
    try {
        console.log("Attempting to fetch data via Proxy...");
        
        // We wrap your URL in a proxy to bypass browser security blocks
        const proxyUrl = "https://corsproxy.io/?";
        const targetUrl = encodeURIComponent(SHEET_CSV_URL);
        
        const response = await fetch(proxyUrl + targetUrl);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.text();
        console.log("Data received successfully.");
        
        parseCSV(data);
        renderAll();
    } catch (error) {
        console.error("Fetch failed:", error);
        // Fallback data so the site still looks good
        projectData = [
            { id: 0, name: "System Offline", year: 2026, tags: ["Error"], description: "The dashboard could not connect to the Google Sheet. Please check the console (F12) for CORS or URL errors." }
        ];
        renderAll();
    }
}

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Splits by comma but ignores commas inside quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (cols.length >= 5) {
            result.push({
                id: parseInt(cols[0].replace(/"/g, '')),
                name: cols[1].replace(/"/g, ''),
                year: parseInt(cols[2].replace(/"/g, '')),
                tags: cols[3].replace(/"/g, '').split(',').map(t => t.trim()),
                description: cols[4].replace(/"/g, '').replace(/\\n/g, '\n')
            });
        }
    }
    projectData = result;
}

function renderAll() {
    renderSkills();
    renderChart();
    renderProjects();
    
    // Check if we should open a specific project from URL
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('p');
    if (pid !== null) openProject(parseInt(pid));
}

// --- RENDERERS ---
function renderSkills() {
    const counts = {};
    projectData.forEach(p => p.tags.forEach(tag => counts[tag] = (counts[tag] || 0) + 1));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    document.getElementById('skillCounter').innerHTML = sorted.map(([name, count]) => `
        <div class="skill-item"><span>${name}</span><span class="skill-count">${count}x</span></div>
    `).join('');
}

function renderChart() {
    const years = {};
    projectData.forEach(p => years[p.year] = (years[p.year] || 0) + 1);
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(years).sort(),
            datasets: [{
                label: 'Projects',
                data: Object.values(years),
                borderColor: '#52b788',
                backgroundColor: 'rgba(82, 183, 136, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: {stepSize: 1}, grid: { color: '#1b2e25' } },
                x: { grid: { color: '#1b2e25' } }
            }
        }
    });
}

function renderProjects(filter = "") {
    const container = document.getElementById('projectContainer');
    const filtered = projectData.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase()) || 
        p.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    );

    container.innerHTML = filtered.map(p => `
        <div class="project-item" style="cursor: pointer;" onclick="openProject(${p.id})">
            <div style="font-weight: bold">${p.name} <span style="color: var(--accent); font-size: 0.7rem;">[VIEW]</span></div>
            <div style="font-size: 0.8rem; color: var(--text-dim)">${p.tags.join(' #')}</div>
        </div>
    `).join('');
}

// --- VIEW LOGIC ---
function openProject(id) {
    const project = projectData.find(p => p.id === id);
    if (!project) return;

    document.getElementById('projectDetailHeader').innerHTML = `
        <h2>${project.name}</h2>
        <div style="color: var(--accent);">YEAR: ${project.year}</div>
        <div style="margin-top: 10px;">${project.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
    `;
    document.getElementById('projectDetailBody').innerText = project.description;
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    window.history.pushState({id: id}, '', `?p=${id}`);
}

function closeProject() {
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('detailView').classList.add('hidden');
    window.history.pushState({}, '', window.location.pathname);
}

// Start everything
document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('projectSearch')?.addEventListener('input', (e) => renderProjects(e.target.value));
});


// for image
function toggleImageSize() {
    const img = document.getElementById('profileImg');
    const overlay = document.getElementById('overlay');
    
    img.classList.toggle('expanded');
    overlay.classList.toggle('visible');
}