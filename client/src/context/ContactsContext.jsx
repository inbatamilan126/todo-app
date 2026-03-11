import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ContactsContext = createContext(null);

export function ContactsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchStatus = useRef('idle'); // tracks 'idle', 'loading', 'success', 'error'

  const fetchContacts = useCallback(async () => {
    // Prevent duplicate fetches or infinite loops
    if (fetchStatus.current === 'loading' || fetchStatus.current === 'success') return;
    
    fetchStatus.current = 'loading';
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/contacts');
      const formattedContacts = response.data.contacts.map((c) => ({
        ...c,
        display: c.name, // required by react-mentions
      }));
      setContacts(formattedContacts);
      fetchStatus.current = 'success';
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      if (err.response?.status === 403) {
        setError('not_connected');
      } else {
        setError(err.message || 'Failed to fetch contacts');
      }
      fetchStatus.current = 'error';
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear contacts from memory on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setContacts(null);
      setError(null);
      fetchStatus.current = 'idle';
    }
  }, [isAuthenticated]);

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        loadingContacts: loading,
        contactsError: error,
        fetchContacts,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
}
