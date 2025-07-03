import React, { useState, useEffect } from 'react';
import { resumeService } from '../services/unifiedResumeService';

interface ResumeDebugProps {
  onClose: () => void;
}

interface TestResult {
  success: boolean;
  status?: number;
  error?: string;
}

const ResumeDebugComponent: React.FC<ResumeDebugProps> = ({ onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const runDebug = async () => {
      setTesting(true);
      try {
        // Get current resume data
        const resumeData = await resumeService.getCurrentResume();
        
        if (!resumeData) {
          setDebugInfo({ error: 'No resume found in database' });
          return;
        }

        // Test original URL
        let originalUrlTest: TestResult = { success: false, error: 'Not tested' };
        try {
          const response = await fetch(resumeData.fileUrl, { method: 'HEAD' });
          originalUrlTest = { success: response.ok, status: response.status };
        } catch (error) {
          originalUrlTest = { success: false, error: error instanceof Error ? error.message : String(error) };
        }

        // Generate different download URLs
        const directUrl = resumeService.getDirectDownloadUrl(resumeData.fileUrl, resumeData.fileName);
        const simpleUrl = resumeService.getSimpleDownloadUrl(resumeData.fileUrl);

        // Test direct download URL
        let directUrlTest: TestResult = { success: false, error: 'Not tested' };
        try {
          const response = await fetch(directUrl, { method: 'HEAD' });
          directUrlTest = { success: response.ok, status: response.status };
        } catch (error) {
          directUrlTest = { success: false, error: error instanceof Error ? error.message : String(error) };
        }

        // Test simple download URL
        let simpleUrlTest: TestResult = { success: false, error: 'Not tested' };
        try {
          const response = await fetch(simpleUrl, { method: 'HEAD' });
          simpleUrlTest = { success: response.ok, status: response.status };
        } catch (error) {
          simpleUrlTest = { success: false, error: error instanceof Error ? error.message : String(error) };
        }

        setDebugInfo({
          resumeData,
          urls: {
            original: { url: resumeData.fileUrl, test: originalUrlTest },
            direct: { url: directUrl, test: directUrlTest },
            simple: { url: simpleUrl, test: simpleUrlTest }
          }
        });

      } catch (error) {
        setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
      }
      setTesting(false);
    };

    runDebug();
  }, []);

  if (testing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md">
          <h3 className="text-lg font-semibold mb-4">Testing Resume URLs...</h3>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-4xl max-h-96 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Resume Debug Information</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          {debugInfo?.error ? (
            <div className="text-red-600 p-3 bg-red-50 rounded">
              Error: {debugInfo.error}
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-semibold mb-2">Resume Data:</h4>
                <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(debugInfo?.resumeData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">URL Tests:</h4>
                {debugInfo?.urls && Object.entries(debugInfo.urls).map(([type, data]: [string, any]) => (
                  <div key={type} className="mb-3 p-3 border rounded">
                    <div className="font-medium capitalize">{type} URL:</div>
                    <div className="text-xs break-all mb-2 font-mono bg-gray-50 dark:bg-gray-700 p-1 rounded">
                      {data.url}
                    </div>
                    <div className={`text-sm ${data.test.success ? 'text-green-600' : 'text-red-600'}`}>
                      Status: {data.test.success ? '✅ Accessible' : '❌ Failed'}
                      {data.test.status && ` (${data.test.status})`}
                      {data.test.error && ` - ${data.test.error}`}
                    </div>
                    <button
                      onClick={() => window.open(data.url, '_blank')}
                      className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Test Download
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded">
                <h4 className="font-semibold mb-2">Recommendations:</h4>
                <ul className="text-sm space-y-1">
                  {debugInfo?.urls?.original?.test?.success ? (
                    <li>✅ Original URL works - use it directly if others fail</li>
                  ) : (
                    <li>❌ Original URL failed - check Cloudinary upload</li>
                  )}
                  {debugInfo?.urls?.direct?.test?.success ? (
                    <li>✅ Direct download URL works</li>
                  ) : (
                    <li>❌ Direct download URL failed - URL transformation issue</li>
                  )}
                  {debugInfo?.urls?.simple?.test?.success ? (
                    <li>✅ Simple download URL works</li>
                  ) : (
                    <li>❌ Simple download URL failed</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeDebugComponent;
