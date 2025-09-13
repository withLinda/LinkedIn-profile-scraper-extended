(function() {
    'use strict';

    function escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const str = String(value);
        
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
    }

    function exportToCsv(people) {
        if (!people || people.length === 0) {
            alert('No data to export');
            return;
        }
        
        const BOM = '\uFEFF';
        
        const headers = ['Name', 'Profile URL', 'Headline', 'Location', 'Current Companies', 'Past Companies', 'Followers'];
        
        const csvContent = BOM + headers.map(escapeCSV).join(',') + '\n' + 
            people.map(person => {
                return [
                    person.name || '',
                    person.profileUrl || '',
                    person.headline || '',
                    person.location || '',
                    (person.summaryCurrent || []).join('; '),
                    (person.summaryPast || []).join('; '),
                    person.followers || ''
                ].map(escapeCSV).join(',');
            }).join('\n');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `linkedin_profiles_${timestamp}.csv`;
        
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
    }

    function exportToHtml(people) {
        if (!people || people.length === 0) {
            alert('No data to export');
            return;
        }
        
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        };
        
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkedIn Profiles Export</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f7fafc;
            padding: 20px;
            color: #2d3748;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: #0077b5;
            color: white;
            padding: 20px;
            font-size: 24px;
        }
        
        .meta {
            padding: 15px 20px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
            color: #718096;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: #edf2f7;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #4a5568;
            border-bottom: 2px solid #cbd5e0;
            position: sticky;
            top: 0;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        tr:hover {
            background: #f7fafc;
        }
        
        .profile-link {
            color: #0077b5;
            text-decoration: none;
            font-weight: 500;
        }
        
        .profile-link:hover {
            text-decoration: underline;
        }
        
        .followers {
            text-align: right;
            font-weight: 500;
            color: #2d3748;
        }
        
        .companies {
            font-size: 13px;
            color: #718096;
        }
        
        .no-data {
            color: #a0aec0;
            font-style: italic;
        }
        
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>LinkedIn Profiles Export</h1>
        <div class="meta">
            <strong>Export Date:</strong> ${new Date().toLocaleDateString()} | 
            <strong>Total Profiles:</strong> ${people.length}
        </div>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Headline</th>
                    <th>Location</th>
                    <th>Current Companies</th>
                    <th>Past Companies</th>
                    <th>Followers</th>
                </tr>
            </thead>
            <tbody>
                ${people.map(person => `
                <tr>
                    <td>
                        ${person.profileUrl ? 
                            `<a href="${escapeHtml(person.profileUrl)}" target="_blank" class="profile-link">${escapeHtml(person.name || 'Unknown')}</a>` :
                            escapeHtml(person.name || 'Unknown')
                        }
                    </td>
                    <td>${escapeHtml(person.headline) || '<span class="no-data">-</span>'}</td>
                    <td>${escapeHtml(person.location) || '<span class="no-data">-</span>'}</td>
                    <td class="companies">
                        ${person.summaryCurrent && person.summaryCurrent.length > 0 ?
                            escapeHtml(person.summaryCurrent.join(', ')) :
                            '<span class="no-data">-</span>'
                        }
                    </td>
                    <td class="companies">
                        ${person.summaryPast && person.summaryPast.length > 0 ?
                            escapeHtml(person.summaryPast.join(', ')) :
                            '<span class="no-data">-</span>'
                        }
                    </td>
                    <td class="followers">
                        ${person.followers ? 
                            person.followers.toLocaleString() :
                            '<span class="no-data">-</span>'
                        }
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `linkedin_profiles_${timestamp}.html`;
        
        downloadFile(htmlContent, filename, 'text/html;charset=utf-8');
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            exportToCsv,
            exportToHtml,
            downloadFile
        };
    } else {
        window.exportToCsv = exportToCsv;
        window.exportToHtml = exportToHtml;
        window.downloadFile = downloadFile;
    }

})();