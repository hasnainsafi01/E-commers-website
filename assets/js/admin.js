// ATELIER ADMIN Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Sales Trends Chart
    const ctx = document.getElementById('salesChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'],
                datasets: [{
                    label: 'Revenue',
                    data: [150000, 220000, 180000, 310000, 290000, 482900],
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#ffffff',
                        titleColor: '#000000',
                        bodyColor: '#666666',
                        borderColor: '#eeeeee',
                        borderWidth: 1,
                        padding: 15,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return '€' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10, weight: '600' },
                            color: '#a0a0a0'
                        }
                    },
                    y: {
                        display: false,
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Mobile Sidebar Toggle
    const mobileToggle = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // 3. Dynamic Stats (Mocked for now, ready for Firestore)
    const updateStats = () => {
        // Here we would fetch from Firestore:
        // const productsSnap = await getDocs(collection(db, 'products'));
        // document.getElementById('totalProducts').innerText = productsSnap.size;
    };

    updateStats();
});
