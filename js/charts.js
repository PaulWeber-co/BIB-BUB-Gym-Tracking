/* ============================================
   CHARTS – Progress graphs per exercise
   ============================================ */

const Charts = (() => {
    let chartInstance = null;
    let currentMetric = 'maxWeight';

    // ---------- Render Progress View ----------
    function renderProgressView() {
        populateExerciseDropdown();
    }

    function populateExerciseDropdown() {
        const select = document.getElementById('progress-exercise-select');
        const exercises = GymData.getAllExercises().sort((a, b) => a.name.localeCompare(b.name));

        // Keep selected value if possible
        const currentValue = select.value;

        // Clear old options (keep the placeholder)
        select.innerHTML = '<option value="">Select an exercise...</option>';

        // Group by muscle group
        const groups = {};
        exercises.forEach(ex => {
            if (!groups[ex.muscleGroup]) groups[ex.muscleGroup] = [];
            groups[ex.muscleGroup].push(ex);
        });

        Object.keys(groups).sort().forEach(group => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;
            groups[group].forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.id;
                opt.textContent = ex.name + (ex.isCustom ? ' (Custom)' : '');
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        });

        // Restore selection
        if (currentValue) select.value = currentValue;
    }

    // ---------- Update Chart ----------
    function updateChart(exerciseId, metric) {
        if (metric) currentMetric = metric;
        if (!exerciseId) {
            destroyChart();
            document.getElementById('chart-empty-state').style.display = 'block';
            return;
        }

        const history = GymData.getExerciseHistory(exerciseId);
        const exercise = GymData.getExerciseById(exerciseId);

        if (history.length === 0) {
            destroyChart();
            document.getElementById('chart-empty-state').textContent =
                'No data yet for this exercise. Complete some workouts first!';
            document.getElementById('chart-empty-state').style.display = 'block';
            return;
        }

        document.getElementById('chart-empty-state').style.display = 'none';

        // Prepare data based on metric
        const labels = history.map(h => {
            const d = new Date(h.date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        let data, label, color;
        switch (currentMetric) {
            case 'maxWeight':
                data = history.map(h => h.maxWeight);
                label = 'Max Weight (kg)';
                color = '#dc3545';
                break;
            case 'volume':
                data = history.map(h => h.totalVolume);
                label = 'Total Volume (kg)';
                color = '#e85d6a';
                break;
            case 'est1rm':
                data = history.map(h => h.est1rm);
                label = 'Est. 1RM (kg)';
                color = '#c82333';
                break;
            default:
                data = history.map(h => h.maxWeight);
                label = 'Max Weight (kg)';
                color = '#dc3545';
        }

        renderChart(labels, data, label, color, exercise ? exercise.name : '');
    }

    function renderChart(labels, data, label, color, title) {
        destroyChart();

        const ctx = document.getElementById('progress-chart').getContext('2d');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label,
                    data,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2.5,
                    pointBackgroundColor: color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    title: {
                        display: true,
                        text: title,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 14,
                            weight: '600',
                        },
                        color: '#1a1a1a',
                        padding: { bottom: 16 },
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleFont: { family: "'Inter', sans-serif" },
                        bodyFont: { family: "'Inter', sans-serif" },
                        cornerRadius: 8,
                        padding: 10,
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#6c757d',
                        },
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: '#f0f0f0' },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#6c757d',
                        },
                    },
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            },
        });
    }

    function destroyChart() {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }

    return {
        renderProgressView,
        updateChart,
    };
})();
