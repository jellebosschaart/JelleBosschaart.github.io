const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPyPDyOqjYsx0BUJU-y1YHMUR0_uZ2YtiYVclhVI0D_Ruc9nJ_82S1Q5megNOU2wv9Jyj-oRo3gzxm/pub?gid=0&single=true&output=csv'; // Link to google docs data



let projectData = [];

function copyEmail() {
    const email = "jnbosschaart@gmail.com";
    const btn = document.getElementById('copyEmailBtn');
    const btnText = document.getElementById('emailBtnText');
    
    // Copy to clipboard
    navigator.clipboard.writeText(email).then(() => {
        // Visual Feedback
        btn.classList.add('copied');
        btnText.innerText = "Copied!";
        
        // Reset after 2 seconds
        setTimeout(() => {
            btn.classList.remove('copied');
            btnText.innerText = "Copy Email";
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}


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
    const ctx = document.getElementById('lineChart');
    if (!ctx || projectData.length === 0) return;

    // 1. Find the range of years
    const allYears = projectData.map(p => p.year);
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);

    // 2. Fill in the gaps (Continuous Timeline)
    const timelineData = {};
    for (let y = minYear; y <= maxYear; y++) {
        timelineData[y] = 0; // Initialize every year in the range
    }

    // 3. Populate with actual counts
    projectData.forEach(p => {
        timelineData[p.year]++;
    });

    const labels = Object.keys(timelineData);
    const dataPoints = Object.values(timelineData);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projects',
                data: dataPoints,
                borderColor: '#10b981', // Trusted Emerald
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    displayColors: false
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    // Suggest a max value to prevent the line from hitting the "ceiling"
                    suggestedMax: Math.max(...dataPoints) + 1,
                    ticks: {
                        stepSize: 1, // Keeps counts as whole numbers
                        color: '#64748b' 
                    }, 
                    grid: { color: '#f1f5f9' } 
                },
                x: { 
                    grid: { display: false }, // Cleaner look for X axis
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

function showView(viewId) {
    // List of all possible views
    const views = ['dashboardView', 'detailView', 'storyView', 'contactView'];
    
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === viewId) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    // Reset URL when going back to dashboard
    if (viewId === 'dashboardView') {
        window.history.pushState({}, '', window.location.pathname);
    }
}

// Update your old functions to use this new logic
function closeProject() {
    showView('dashboardView');
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
            <div style="font-size: 0.8rem; color: var(--text-dim)">${p.tags.join(', ')}</div>
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
        <div style="margin-top: 10px;">${project.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
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

// Start listener
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