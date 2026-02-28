const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPyPDyOqjYsx0BUJU-y1YHMUR0_uZ2YtiYVclhVI0D_Ruc9nJ_82S1Q5megNOU2wv9Jyj-oRo3gzxm/pub?gid=0&single=true&output=csv'; 

let projectData = [];

// --- NEW: FILTER STATE ---
let activeYearFilter = null;
let activeSkillFilter = null;


function copyEmail() {
    const email = "jnbosschaart@gmail.com";
    const btn = document.getElementById('copyEmailBtn');
    const btnText = document.getElementById('emailBtnText');
    
    navigator.clipboard.writeText(email).then(() => {
        btn.classList.add('copied');
        btnText.innerText = "Copied!";
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

// --- NEW: THE FILTER ENGINE ---
// This function gets the data but lets you tell it which filter to "ignore"
function getFilteredProjects(excludeFilter = 'none') {
    const searchTerm = document.getElementById('projectSearch')?.value.toLowerCase() || "";
    
    return projectData.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) || p.tags.some(t => t.toLowerCase().includes(searchTerm));
        const matchesSkill = (excludeFilter === 'skill' || !activeSkillFilter) ? true : p.tags.includes(activeSkillFilter);
        const matchesYear = (excludeFilter === 'year' || !activeYearFilter) ? true : p.year.toString() === activeYearFilter.toString();
        
        return matchesSearch && matchesSkill && matchesYear;
    });
}

function applyAllFilters() {
    renderSkills();
    renderChart();
    renderProjects();
    toggleClearButton();
}

function clearFilters() {
    activeYearFilter = null;
    activeSkillFilter = null;
    const searchInput = document.getElementById('projectSearch');
    if (searchInput) searchInput.value = "";
    applyAllFilters();
}

function toggleClearButton() {
    const statusDiv = document.getElementById('filterStatus');
    const searchVal = document.getElementById('projectSearch')?.value || "";
    
    if (statusDiv) {
        if (activeYearFilter || activeSkillFilter || searchVal.length > 0) {
            statusDiv.classList.remove('hidden');
        } else {
            statusDiv.classList.add('hidden');
        }
    }
}
function renderAll() {
    renderSkills();
    renderChart();
    renderProjects();
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('p');
    if (pid !== null) openProject(parseInt(pid));
}


// --- RENDERERS ---

function toggleSkillFilter(skillName) {
    activeSkillFilter = (activeSkillFilter === skillName) ? null : skillName;
    applyAllFilters();
}

function renderSkills() {
    // 1. Get filtered data (but ignore the skill filter so all skills still show)
    const dataForSkills = getFilteredProjects('skill');
    const counts = {};
    
    dataForSkills.forEach(p => p.tags.forEach(tag => counts[tag] = (counts[tag] || 0) + 1));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    const container = document.getElementById('skillCounter');
    container.innerHTML = sorted.map(([name, count]) => `
        <div class="skill-item ${activeSkillFilter === name ? 'active-filter' : ''}" 
             onclick="toggleSkillFilter('${name}')">
            <span>${name}</span>
            <span class="skill-count">${count}x</span>
        </div>
    `).join('');
}


function renderChart() {
    const ctx = document.getElementById('lineChart');
    if (!ctx || projectData.length === 0) return;

    const allYears = projectData.map(p => p.year);
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);

    const dataForChart = getFilteredProjects('year');

    const timelineData = {};
    for (let y = minYear; y <= maxYear; y++) {
        timelineData[y] = 0; 
    }

    dataForChart.forEach(p => {
        timelineData[p.year]++;
    });

    const labels = Object.keys(timelineData);
    const dataPoints = Object.values(timelineData);

    const pointColors = labels.map(y => y.toString() === activeYearFilter ? '#ffffff' : '#10b981');
    const pointRadii = labels.map(y => y.toString() === activeYearFilter ? 7 : 4);
    const pointBorderColors = labels.map(y => y.toString() === activeYearFilter ? '#10b981' : '#10b981');
    const pointBorderWidths = labels.map(y => y.toString() === activeYearFilter ? 3 : 1);

    // THE FIX: If chart exists, update it. If not, create it.
    if (window.myChart) {
        window.myChart.data.labels = labels;
        window.myChart.data.datasets[0].data = dataPoints;
        window.myChart.data.datasets[0].pointBackgroundColor = pointColors;
        window.myChart.data.datasets[0].pointRadius = pointRadii;
        window.myChart.data.datasets[0].pointBorderColor = pointBorderColors;
        window.myChart.data.datasets[0].pointBorderWidth = pointBorderWidths;
        
        // Calling update() makes the changes smooth without the flash/fade
        window.myChart.update();
    } else {
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Projects',
                    data: dataPoints,
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: pointRadii,
                    pointBackgroundColor: pointColors,
                    pointBorderColor: pointBorderColors,
                    pointBorderWidth: pointBorderWidths,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // Add animation duration zero if you want clicks to be completely instant
                // animation: { duration: 0 }, 
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const clickedYear = window.myChart.data.labels[index];
                        activeYearFilter = (activeYearFilter === clickedYear.toString()) ? null : clickedYear.toString();
                        applyAllFilters();
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', titleColor: '#ffffff', bodyColor: '#ffffff', displayColors: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        suggestedMax: Math.max(...dataPoints) + 1,
                        ticks: { stepSize: 1, color: '#64748b' }, 
                        grid: { color: '#f1f5f9' } 
                    },
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
}

function renderProjects() {
    const container = document.getElementById('projectContainer');
    // For the list, apply ALL filters
    const filtered = getFilteredProjects('none');

    container.innerHTML = filtered.map(p => `
        <div class="project-item" style="cursor: pointer;" onclick="openProject(${p.id})">
            <div style="font-weight: bold">${p.name} <span style="color: var(--accent); font-size: 0.7rem;">[VIEW]</span></div>
            <div style="font-size: 0.8rem; color: var(--text-dim)">${p.year} • ${p.tags.join(', ')}</div>
        </div>
    `).join('');
}


// --- VIEW LOGIC ---
function openProject(id) {
    const project = projectData.find(p => p.id === id);
    if (!project) return;
    document.getElementById('projectDetailHeader').innerHTML = `
        <h2>${project.name}</h2>
        <div style="color: var(--accent);">${project.year}</div>
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

function showView(viewId) {
    const views = ['dashboardView', 'detailView', 'storyView', 'contactView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === viewId) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });
    if (viewId === 'dashboardView') window.history.pushState({}, '', window.location.pathname);
}

function toggleImageSize() {
    const img = document.getElementById('profileImg');
    const overlay = document.getElementById('overlay');
    img.classList.toggle('expanded');
    overlay.classList.toggle('visible');
}

// Start listener
document.addEventListener('DOMContentLoaded', () => {
    init();
    // Use the applyAllFilters engine instead of just re-rendering projects
    document.getElementById('projectSearch')?.addEventListener('input', () => applyAllFilters());
});