(function() {
    'use strict';


    function getUtilsModule() {
        if (typeof module !== 'undefined' && module.exports) {
            try {
                return require('./utils');
            } catch (error) {
                // Ignore resolve errors when running in Node
                return {};
            }
        }

        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});

        const modules = root.LinkedInScraperModules || {};
        return modules.utils || {};
    }

    function getThemeModule() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./theme'); } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const modules = root.LinkedInScraperModules || {};
        return modules.theme || {};
    }

    function getUiStylesModule() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./ui/styles'); } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const modules = root.LinkedInScraperModules || {};
        return modules.uiStyles || {};
    }

    function getExportHandler(utilsModule, name) {
        if (utilsModule && typeof utilsModule[name] === 'function') {
            return utilsModule[name];
        }

        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});

        const fallback = root[name];
        return typeof fallback === 'function' ? fallback : null;
    }

    function resolvePersonColumns(utilsModule) {
        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        const schema = mods.schema || {};
        const columns = Array.isArray(schema.PERSON_COLUMNS) ? schema.PERSON_COLUMNS : null;
        if (columns && columns.length) return columns;
        // Last-resort fallback to a minimal set if schema not present
        return [{ key:'name',label:'Name'},{ key:'profileUrl',label:'Profile URL'}];
    }

    const utilsModule = getUtilsModule();
    const themeModule = getThemeModule();
    const uiStylesModule = getUiStylesModule();

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
            this.columns = resolvePersonColumns(utilsModule);
        }

        resolveHandlers() {
            const utilsModule = getUtilsModule();
            return {
                csv: getExportHandler(utilsModule, 'exportToCsv'),
                html: getExportHandler(utilsModule, 'exportToHtml')
            };
        }
        
        init() {
            if (document.getElementById('linkedin-scraper-ui')) {
                this.destroy();
            }
            // Inject base CSS (structure/layout), then apply theme tokens
            if (uiStylesModule && typeof uiStylesModule.injectUiBaseStyles === 'function') {
                uiStylesModule.injectUiBaseStyles();
            }
            this.createContainer();
            this.createHeader();
            this.createProgressSection();
            this.createResultsSection();
            this.createExportSection();
            this.attachEventListeners();
            
            if (themeModule && typeof themeModule.applyTheme === 'function') {
                themeModule.applyTheme(this.container);
            }

            document.body.appendChild(this.container);
        }
        
        // createStyles() removed; UI now uses ui/styles.js + theme for CSS
        
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
            const headerCells = this.columns.map(column => `<th>${column.label}</th>`).join('');
            thead.innerHTML = `<tr>${headerCells}</tr>`;
            
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
            csvButton.dataset.exportType = 'csv';
            csvButton.textContent = 'Export CSV';
            csvButton.disabled = true;
            csvButton.onclick = () => {
                const { csv } = this.resolveHandlers();
                if (csv) { csv(this.people); }
                else { this.showError('Export to CSV is not available yet.'); }
            };
            
            const htmlButton = document.createElement('button');
            htmlButton.className = 'export-button';
            htmlButton.dataset.exportType = 'html';
            htmlButton.textContent = 'Export HTML';
            htmlButton.disabled = true;
            htmlButton.onclick = () => {
                const { html } = this.resolveHandlers();
                if (html) { html(this.people); }
                else { this.showError('Export to HTML is not available yet.'); }
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

        setCellEmpty(cell) {
            cell.textContent = '-';
            cell.classList.add('empty');
        }

        createCellForColumn(column, person) {
            const cell = document.createElement('td');
            const value = person ? person[column.key] : null;

            if (column.key === 'profileUrl') {
                if (value) {
                    const link = document.createElement('a');
                    link.href = value;
                    link.textContent = value;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.className = 'profile-link';
                    cell.appendChild(link);
                    cell.title = value;
                } else {
                    this.setCellEmpty(cell);
                }
                return cell;
            }

            if (column.key === 'followers') {
                if (typeof value === 'string' && value.trim()) {
                    cell.textContent = value;                // e.g., "30K followers"
                    cell.classList.add('followers');
                } else if (typeof value === 'number' && Number.isFinite(value)) {
                    cell.textContent = value.toLocaleString();
                    cell.classList.add('numeric');
                } else {
                    this.setCellEmpty(cell);
                }
                return cell;
            }

            if (value == null || String(value).trim() === '') {
                this.setCellEmpty(cell);
                return cell;
            }

            const textValue = String(value).trim();
            cell.textContent = textValue;
            cell.title = textValue;
            return cell;
        }

        addRow(person) {
            this.people.push(person);

            const row = document.createElement('tr');
            this.columns.forEach(column => {
                const cell = this.createCellForColumn(column, person);
                row.appendChild(cell);
            });

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
            if (people) this.people = people;
            const { csv, html } = this.resolveHandlers();
            this.exportButtons.forEach(btn => {
                btn.disabled = btn.dataset.exportType === 'csv' ? !csv : !html;
            });
        }
        
        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            // Keep shared base/theme styles in DOM; they are idempotent and used across sessions.
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScraperUI;
    } else {
        window.ScraperUI = ScraperUI;
    }

})();
