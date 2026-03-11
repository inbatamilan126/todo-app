import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { TaskProvider } from './context/TaskContext';
import { LabelProvider } from './context/LabelContext';
import { ContactsProvider } from './context/ContactsContext';
import { registerSW } from 'virtual:pwa-register';
import './styles/globals.css';

// Register the PWA service worker
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ContactsProvider>
            <ProjectProvider>
              <LabelProvider>
                <TaskProvider>
                  <App />
                </TaskProvider>
              </LabelProvider>
            </ProjectProvider>
          </ContactsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
