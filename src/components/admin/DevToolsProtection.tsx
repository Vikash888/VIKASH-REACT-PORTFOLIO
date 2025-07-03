import { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { Shield, AlertTriangle, Terminal } from 'lucide-react';

const DevToolsProtection = () => {
  const [devToolsBlocked, setDevToolsBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDevToolsStatus();
    initializeDevToolsProtection();
  }, []);

  const loadDevToolsStatus = async () => {
    if (!database) return;
    
    try {
      const devToolsRef = ref(database, 'settings/devTools');
      const snapshot = await get(devToolsRef);
      if (snapshot.exists()) {
        setDevToolsBlocked(snapshot.val().blocked || false);
      }
    } catch (error) {
      console.error('Error loading dev tools status:', error);
    }
  };

  const toggleDevTools = async () => {
    if (!database) return;
    
    setSaving(true);
    try {
      const newState = !devToolsBlocked;
      await set(ref(database, 'settings/devTools'), {
        blocked: newState,
        updatedAt: Date.now()
      });
      setDevToolsBlocked(newState);
      updateProtection(newState);
    } catch (error) {
      console.error('Error toggling dev tools:', error);
    }
    setSaving(false);
  };

  const initializeDevToolsProtection = () => {
    // Initial setup of dev tools protection
    const script = document.createElement('script');
    script.id = 'devtools-protection';
    script.innerHTML = `
      (function() {
        function blockDevTools() {
          document.addEventListener('keydown', function(e) {
            if (
              (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
              (e.key === 'F12')
            ) {
              e.preventDefault();
            }
          });
          
          setInterval(function() {
            const devtools = /./;
            devtools.toString = function() {
              if (!${devToolsBlocked}) return '';
              document.body.innerHTML = 'Developer Tools are disabled';
              return '';
            }
            console.log('%c', devtools);
          }, 1000);
        }
        
        if (${devToolsBlocked}) {
          blockDevTools();
        }
      })();
    `;
    document.head.appendChild(script);
  };

  const updateProtection = (blocked: boolean) => {
    // Remove existing protection script
    const existingScript = document.getElementById('devtools-protection');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Add updated protection if needed
    if (blocked) {
      initializeDevToolsProtection();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
              <Terminal className="w-6 h-6" />
              Developer Tools Protection
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Control access to browser developer tools
            </p>
          </div>
          <button
            onClick={toggleDevTools}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              devToolsBlocked
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            <Shield className="w-4 h-4" />
            {devToolsBlocked ? 'Disable Protection' : 'Enable Protection'}
          </button>
        </div>

        {devToolsBlocked && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Developer Tools Protection Active</span>
            </div>
            <p className="mt-2 text-sm text-blue-600 dark:text-blue-300">
              Browser developer tools are currently blocked for all users
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-800 dark:text-yellow-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-800 dark:text-yellow-200 font-medium">Important Note</h3>
              <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-300">
                While this protection helps prevent casual access to developer tools, it's important to note that determined users may still find ways around it. This should be used as part of a broader security strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevToolsProtection;