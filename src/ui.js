(function() {
    'use strict';

    class ScraperUI {
        constructor() {
            this.container = null;
            this.progressBar = null;
            this.progressText = null;
            this.resultsCounter = null;
            this.resultsTable = null;
            this.resultsBody = null;
            this.exportButtons = null;
            this.errorMessage = null;
            this.people = [];
        }
        
        init() {
            if (document.getElementById('linkedin-scraper-ui')) {
                this.destroy();
            }
            
            this.createStyles();
            this.createContainer();
            this.createHeader();
            this.createProgressSection();
            this.createResultsSection();
            this.createExportSection();
            this.attachEventListeners();
            
            document.body.appendChild(this.container);
        }
        
        createStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #linkedin-scraper-ui {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 500px;
                    max-height: 80vh;
                    background: rgba(26, 32, 44, 0.95);
                    border: 1px solid #4a5568;
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    z-index: 9999;
                    font-family: system-ui, -apple-system, sans-serif;
                    color: #e2e8f0;
                    display: flex;
                    flex-direction: column;
                }
                
                #linkedin-scraper-ui * {
                    box-sizing: border-box;
                }
                
                .scraper-header {
                    padding: 16px;
                    border-bottom: 1px solid #4a5568;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .scraper-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #63b3ed;
                }
                
                .scraper-close {
                    background: transparent;
                    border: none;
                    color: #a0aec0;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .scraper-close:hover {
                    color: #f56565;
                }
                
                .scraper-progress {
                    padding: 16px;
                    border-bottom: 1px solid #4a5568;
                }
                
                .progress-bar-container {
                    background: #2d3748;
                    border-radius: 4px;
                    height: 8px;
                    margin-bottom: 8px;
                    overflow: hidden;
                }
                
                .progress-bar {
                    background: #48bb78;
                    height: 100%;
                    width: 0%;
                    transition: width 0.3s ease;
                }
                
                .progress-text {
                    font-size: 14px;
                    color: #a0aec0;
                    text-align: center;
                }
                
                .results-counter {
                    padding: 8px 16px;
                    background: #2d3748;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .results-table-container {
                    max-height: 400px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .results-table {
                    width: 100%;
                    font-size: 13px;
                }
                
                .results-table th {
                    background: #2d3748;
                    padding: 8px;
                    text-align: left;
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                
                .results-table td {
                    padding: 8px;
                    border-bottom: 1px solid #2d3748;
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .results-table tr:hover {
                    background: rgba(56, 178, 172, 0.1);
                }
                
                .export-section {
                    padding: 16px;
                    border-top: 1px solid #4a5568;
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }
                
                .export-button {
                    background: #3182ce;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .export-button:hover:not(:disabled) {
                    background: #2c5282;
                }
                
                .export-button:disabled {
                    background: #4a5568;
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                
                .error-message {
                    position: absolute;
                    bottom: 70px;
                    left: 16px;
                    right: 16px;
                    background: #f56565;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 13px;
                    display: none;
                    animation: slideUp 0.3s ease;
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .results-table-container::-webkit-scrollbar {
                    width: 8px;
                }
                
                .results-table-container::-webkit-scrollbar-track {
                    background: #2d3748;
                }
                
                .results-table-container::-webkit-scrollbar-thumb {
                    background: #4a5568;
                    border-radius: 4px;
                }
                
                .results-table-container::-webkit-scrollbar-thumb:hover {
                    background: #718096;
                }
            `;
            document.head.appendChild(style);
        }
        
        createContainer() {
            this.container = document.createElement('div');
            this.container.id = 'linkedin-scraper-ui';
        }
        
        createHeader() {
            const header = document.createElement('div');
            header.className = 'scraper-header';
            
            const title = document.createElement('div');
            title.className = 'scraper-title';
            title.textContent = 'LinkedIn Scraper';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'scraper-close';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = () => this.destroy();
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            this.container.appendChild(header);
        }
        
        createProgressSection() {
            const progressSection = document.createElement('div');
            progressSection.className = 'scraper-progress';
            
            const barContainer = document.createElement('div');
            barContainer.className = 'progress-bar-container';
            
            this.progressBar = document.createElement('div');
            this.progressBar.className = 'progress-bar';
            
            barContainer.appendChild(this.progressBar);
            
            this.progressText = document.createElement('div');
            this.progressText.className = 'progress-text';
            this.progressText.textContent = '0 of 0 profiles';
            
            progressSection.appendChild(barContainer);
            progressSection.appendChild(this.progressText);
            this.container.appendChild(progressSection);
        }
        
        createResultsSection() {
            this.resultsCounter = document.createElement('div');
            this.resultsCounter.className = 'results-counter';
            this.resultsCounter.textContent = 'Found: 0 unique profiles';
            this.container.appendChild(this.resultsCounter);
            
            const tableContainer = document.createElement('div');
            tableContainer.className = 'results-table-container';
            
            this.resultsTable = document.createElement('table');
            this.resultsTable.className = 'results-table';
            
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Name</th>
                    <th>Headline</th>
                    <th>Location</th>
                    <th>Followers</th>
                </tr>
            `;
            
            this.resultsBody = document.createElement('tbody');
            
            this.resultsTable.appendChild(thead);
            this.resultsTable.appendChild(this.resultsBody);
            tableContainer.appendChild(this.resultsTable);
            this.container.appendChild(tableContainer);
        }
        
        createExportSection() {
            const exportSection = document.createElement('div');
            exportSection.className = 'export-section';
            
            const csvButton = document.createElement('button');
            csvButton.className = 'export-button';
            csvButton.textContent = 'Export CSV';
            csvButton.disabled = true;
            csvButton.onclick = () => {
                if (typeof exportToCsv === 'function') {
                    exportToCsv(this.people);
                }
            };
            
            const htmlButton = document.createElement('button');
            htmlButton.className = 'export-button';
            htmlButton.textContent = 'Export HTML';
            htmlButton.disabled = true;
            htmlButton.onclick = () => {
                if (typeof exportToHtml === 'function') {
                    exportToHtml(this.people);
                }
            };
            
            exportSection.appendChild(csvButton);
            exportSection.appendChild(htmlButton);
            
            this.exportButtons = [csvButton, htmlButton];
            this.container.appendChild(exportSection);
            
            this.errorMessage = document.createElement('div');
            this.errorMessage.className = 'error-message';
            this.container.appendChild(this.errorMessage);
        }
        
        attachEventListeners() {
            this.container.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }
        
        updateProgress(current, total) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            this.progressBar.style.width = `${percentage}%`;
            this.progressText.textContent = `${current} of ${total} profiles`;
            this.resultsCounter.textContent = `Found: ${current} unique profiles`;
        }
        
        addRow(person) {
            this.people.push(person);
            
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = person.name || '-';
            nameCell.title = person.name || '';
            
            const headlineCell = document.createElement('td');
            headlineCell.textContent = person.headline || '-';
            headlineCell.title = person.headline || '';
            
            const locationCell = document.createElement('td');
            locationCell.textContent = person.location || '-';
            locationCell.title = person.location || '';
            
            const followersCell = document.createElement('td');
            followersCell.textContent = person.followers ? 
                person.followers.toLocaleString() : '-';
            
            row.appendChild(nameCell);
            row.appendChild(headlineCell);
            row.appendChild(locationCell);
            row.appendChild(followersCell);
            
            this.resultsBody.appendChild(row);
            
            this.resultsCounter.textContent = `Found: ${this.people.length} unique profiles`;
        }
        
        showError(message) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 5000);
        }
        
        enableExport(people) {
            if (people) {
                this.people = people;
            }
            this.exportButtons.forEach(btn => {
                btn.disabled = false;
            });
        }
        
        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            
            const style = document.querySelector('style');
            if (style && style.textContent.includes('#linkedin-scraper-ui')) {
                style.parentNode.removeChild(style);
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScraperUI;
    } else {
        window.ScraperUI = ScraperUI;
    }

})();