// src/styles/componentStyles.ts

export const componentStyles = `
:host {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  max-width: 800px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: #fdfdfd;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  color: #333;
}

h1 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
}

.controls {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

select, input[type="number"] {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.engines-list {
  display: flex;
  gap: 1rem;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

button {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #2980b9;
}

button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.status {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #eef7fe;
  border-left: 4px solid #3498db;
  border-radius: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th {
  text-align: left;
  background: #f8f9fa;
  padding: 0.75rem;
  border-bottom: 2px solid #dee2e6;
  font-size: 0.9rem;
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.error {
  color: #e74c3c;
  background: #fdf2f2;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  border: 1px solid #fadbd8;
}

.warning {
  color: #f39c12;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  font-weight: bold;
}

.results-section {
  margin-top: 2rem;
}

.top-result {
  background: #f0fff4;
  border: 1px solid #c6f6d5;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1.5rem;
}

.top-result h3 {
  margin-top: 0;
  font-size: 1rem;
  color: #276749;
}
`;
