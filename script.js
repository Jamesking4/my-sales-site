class RevenueAnalyzer {
    constructor() {
        this.data = [];
        this.years = new Set();
        this.currentYear = 'all';
        this.totalRevenue = 0;
        this.totalOrders = 0;
        this.totalStates = 0;
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.populateYearSelector();
            this.updateAllStats();
            this.setupEventListeners();
            this.hideLoading();
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError('Не удалось загрузить данные. Проверьте консоль для подробностей.');
        }
    }

    async loadData() {
        try {
            const response = await fetch('orders_customers.csv');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvData = await response.text();
            
            if (!csvData || csvData.trim().length === 0) {
                throw new Error('CSV файл пустой или содержит неверные данные');
            }
            
            console.log('CSV данные загружены из файла');
            this.parseCSV(csvData);
            
        } catch (error) {
            console.warn('Ошибка загрузки из файла, используем тестовые данные:', error);
            this.useTestData();
        }
    }

    useTestData() {
        const testData = `name,segment,state,city,order_date,ship_mode,sales
John Doe,Consumer,California,Los Angeles,2023-01-15,Standard,150.50
Jane Smith,Corporate,Texas,Houston,2023-02-20,Express,299.99
Bob Johnson,Home Office,Florida,Miami,2023-03-10,Standard,89.99
Alice Brown,Consumer,New York,New York,2023-04-05,Express,450.00
Mike Wilson,Corporate,California,San Francisco,2023-05-20,Standard,199.99
Sarah Davis,Home Office,Texas,Austin,2023-06-15,Express,350.75
Tom Miller,Consumer,Illinois,Chicago,2023-07-10,Standard,125.00
Emily Taylor,Corporate,Florida,Orlando,2023-08-05,Express,275.50
David Anderson,Home Office,Washington,Seattle,2023-09-20,Standard,189.99
Lisa Martinez,Consumer,California,San Diego,2023-10-15,Express,420.00
James Wilson,Corporate,Texas,Houston,2022-11-10,Standard,230.00
Emma Thompson,Home Office,New York,Buffalo,2022-12-05,Express,310.50
Robert Garcia,Consumer,Illinois,Chicago,2022-01-20,Standard,95.99
Olivia Lee,Corporate,Florida,Tampa,2022-02-15,Express,280.00
William Harris,Home Office,California,Los Angeles,2022-03-10,Standard,175.50
Michael Clark,Consumer,Ohio,Columbus,2023-11-05,Standard,320.00
Jennifer Lewis,Corporate,Michigan,Detroit,2023-12-10,Express,410.25
Christopher Walker,Home Office,Georgia,Atlanta,2023-01-25,Standard,185.75
Amanda Hall,Consumer,North Carolina,Charlotte,2023-02-15,Express,295.50
Daniel Young,Corporate,Virginia,Richmond,2023-03-20,Standard,215.00`;

        console.log('Используются тестовые данные');
        this.parseCSV(testData);
    }

    parseCSV(csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        
        if (lines.length <= 1) {
            throw new Error('CSV файл не содержит данных или имеет неверный формат');
        }

        const headers = lines[0].split(',').map(header => header.trim());
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const values = line.split(',').map(value => value.trim());
            
            if (values.length === headers.length) {
                const order = {};
                headers.forEach((header, index) => {
                    order[header] = values[index];
                });
                
                if (order.order_date) {
                    const orderDate = new Date(order.order_date);
                    if (!isNaN(orderDate)) {
                        order.year = orderDate.getFullYear();
                        this.years.add(order.year);
                    }
                }
                
                order.sales = parseFloat(order.sales) || 0;
                this.data.push(order);
            }
        }
        
        console.log('Загружено записей:', this.data.length);
        console.log('Найденные годы:', Array.from(this.years));
    }

    populateYearSelector() {
        const yearSelect = document.getElementById('year-select');
        const sortedYears = Array.from(this.years).sort((a, b) => b - a);
        
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        document.getElementById('year-select').addEventListener('change', (e) => {
            this.currentYear = e.target.value;
            this.updateAllStats();
        });
    }

    calculateOverallStats() {
        let filteredData = this.data;
        
        if (this.currentYear !== 'all') {
            const year = parseInt(this.currentYear);
            filteredData = this.data.filter(order => order.year === year);
        }

        const stateStats = {};
        let totalRevenue = 0;
        let totalOrders = 0;

        filteredData.forEach(order => {
            if (!order.state) return;
            
            if (!stateStats[order.state]) {
                stateStats[order.state] = {
                    orders: 0,
                    revenue: 0
                };
            }
            
            stateStats[order.state].orders++;
            stateStats[order.state].revenue += order.sales;
            
            totalOrders++;
            totalRevenue += order.sales;
        });

        const totalStates = Object.keys(stateStats).length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const avgStateRevenue = totalStates > 0 ? totalRevenue / totalStates : 0;

        return {
            totalRevenue,
            totalOrders,
            totalStates,
            avgOrderValue,
            avgStateRevenue,
            stateStats
        };
    }

    getTopStates(stateStats, totalRevenue) {
        return Object.entries(stateStats)
            .map(([state, stats]) => ({
                state,
                orders: stats.orders,
                revenue: stats.revenue,
                percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }

    updateAllStats() {
        const stats = this.calculateOverallStats();
        const topStates = this.getTopStates(stats.stateStats, stats.totalRevenue);
        
        this.updateMainStats(stats);
        this.updateTable(topStates, stats.totalRevenue);
        this.updateOverallStats(stats);
        this.updatePreviewStats(stats.totalRevenue);
    }

    updateMainStats(stats) {
        this.formatAndSetValue('total-revenue', stats.totalRevenue, '$');
        this.formatAndSetValue('total-orders', stats.totalOrders, '');
        this.formatAndSetValue('total-states', stats.totalStates, '');
        this.formatAndSetValue('avg-order', stats.avgOrderValue, '$');
    }

    updatePreviewStats(totalRevenue) {
        this.formatAndSetValue('total-revenue-preview', totalRevenue, '$');
    }

    updateOverallStats(stats) {
        this.formatAndSetValue('overall-revenue', stats.totalRevenue, '$');
        this.formatAndSetValue('overall-orders', stats.totalOrders, '');
        this.formatAndSetValue('overall-states', stats.totalStates, '');
        this.formatAndSetValue('avg-state-revenue', stats.avgStateRevenue, '$');
    }

    formatAndSetValue(elementId, value, prefix = '') {
        const element = document.getElementById(elementId);
        if (element) {
            if (typeof value === 'number') {
                if (value >= 1000) {
                    element.textContent = `${prefix}${value.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}`;
                } else {
                    element.textContent = `${prefix}${value.toFixed(2)}`;
                }
            } else {
                element.textContent = `${prefix}${value}`;
            }
        }
    }

    updateTable(topStates, totalRevenue) {
        const tableBody = document.getElementById('table-body');
        
        tableBody.innerHTML = '';
        
        if (topStates.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #666; padding: 40px;">
                        Нет данных для отображения
                    </td>
                </tr>
            `;
            return;
        }
        
        topStates.forEach((stateData, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td class="rank-cell">${index + 1}</td>
                <td class="state-cell">${stateData.state}</td>
                <td class="orders-cell">${stateData.orders.toLocaleString()}</td>
                <td class="revenue-cell">$${stateData.revenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</td>
                <td class="percentage-cell">${stateData.percentage.toFixed(1)}%</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #d32f2f; padding: 40px; font-weight: 500;">
                    ${message}
                </td>
            </tr>
        `;
        this.hideLoading();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new RevenueAnalyzer();
});