import React, { useState, useEffect } from 'react';
import { supabase, saveContentToDatabase, loadContentFromDatabase } from '../lib/supabase';
import { Database, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DatabaseTestPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const DatabaseTestPanel: React.FC<DatabaseTestPanelProps> = ({ isVisible, onClose }) => {
  const [testResults, setTestResults] = useState<{
    connection: 'testing' | 'success' | 'failed';
    authentication: 'testing' | 'success' | 'failed';
    readAccess: 'testing' | 'success' | 'failed';
    writeAccess: 'testing' | 'success' | 'failed';
    globalPersistence: 'testing' | 'success' | 'failed';
  }>({
    connection: 'testing',
    authentication: 'testing',
    readAccess: 'testing',
    writeAccess: 'testing',
    globalPersistence: 'testing'
  });

  const [testData, setTestData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    if (isVisible) {
      runDatabaseTests();
    }
  }, [isVisible]);

  const runDatabaseTests = async () => {
    console.log('🧪 Starting comprehensive database tests...');
    
    // Reset test results
    setTestResults({
      connection: 'testing',
      authentication: 'testing',
      readAccess: 'testing',
      writeAccess: 'testing',
      globalPersistence: 'testing'
    });
    setErrorDetails('');

    try {
      // Test 1: Basic Connection
      console.log('🔌 Testing Supabase connection...');
      const { data: healthCheck, error: connectionError } = await supabase
        .from('site_content')
        .select('count')
        .limit(1);

      if (connectionError) {
        setTestResults(prev => ({ ...prev, connection: 'failed' }));
        setErrorDetails(`Connection failed: ${connectionError.message}`);
        return;
      }

      setTestResults(prev => ({ ...prev, connection: 'success' }));
      console.log('✅ Connection successful');

      // Test 2: Authentication Status
      console.log('🔐 Testing authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setTestResults(prev => ({ ...prev, authentication: 'failed' }));
        setErrorDetails(prev => prev + `\nAuthentication failed: ${authError?.message || 'No user logged in'}`);
      } else {
        setTestResults(prev => ({ ...prev, authentication: 'success' }));
        console.log('✅ Authentication successful');
      }

      // Test 3: Read Access
      console.log('📖 Testing read access...');
      const loadedData = await loadContentFromDatabase();
      
      if (loadedData !== null) {
        setTestResults(prev => ({ ...prev, readAccess: 'success' }));
        setTestData(loadedData);
        console.log('✅ Read access successful');
      } else {
        setTestResults(prev => ({ ...prev, readAccess: 'failed' }));
        setErrorDetails(prev => prev + '\nRead access failed: Unable to load content');
      }

      // Test 4: Write Access (only if authenticated)
      if (user) {
        console.log('✏️ Testing write access...');
        const testContent = {
          testTimestamp: new Date().toISOString(),
          testId: Math.random().toString(36).substr(2, 9),
          message: 'Database connectivity test'
        };

        const writeSuccess = await saveContentToDatabase(testContent);
        
        if (writeSuccess) {
          setTestResults(prev => ({ ...prev, writeAccess: 'success' }));
          console.log('✅ Write access successful');

          // Test 5: Global Persistence (verify the write was actually saved)
          console.log('🌍 Testing global persistence...');
          setTimeout(async () => {
            const verificationData = await loadContentFromDatabase();
            
            if (verificationData && verificationData.testId === testContent.testId) {
              setTestResults(prev => ({ ...prev, globalPersistence: 'success' }));
              console.log('✅ Global persistence confirmed - changes will be visible to ALL users!');
            } else {
              setTestResults(prev => ({ ...prev, globalPersistence: 'failed' }));
              setErrorDetails(prev => prev + '\nGlobal persistence failed: Data not persisted globally');
            }
          }, 2000);
        } else {
          setTestResults(prev => ({ ...prev, writeAccess: 'failed', globalPersistence: 'failed' }));
          setErrorDetails(prev => prev + '\nWrite access failed: Unable to save content');
        }
      } else {
        setTestResults(prev => ({ ...prev, writeAccess: 'failed', globalPersistence: 'failed' }));
        setErrorDetails(prev => prev + '\nWrite access failed: Authentication required');
      }

    } catch (error) {
      console.error('❌ Database test error:', error);
      setErrorDetails(`Unexpected error: ${error}`);
      setTestResults({
        connection: 'failed',
        authentication: 'failed',
        readAccess: 'failed',
        writeAccess: 'failed',
        globalPersistence: 'failed'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'testing':
        return 'Testing...';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const getOverallStatus = () => {
    const results = Object.values(testResults);
    if (results.every(status => status === 'success')) {
      return { status: 'success', message: 'All tests passed! Changes will be visible globally.' };
    } else if (results.some(status => status === 'testing')) {
      return { status: 'testing', message: 'Running tests...' };
    } else {
      return { status: 'failed', message: 'Some tests failed. Check details below.' };
    }
  };

  if (!isVisible) return null;

  const overallStatus = getOverallStatus();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="text-blue-600" size={24} />
            Database Connectivity Test
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            ✕
          </button>
        </div>

        {/* Overall Status */}
        <div className={`p-4 border-b ${
          overallStatus.status === 'success' ? 'bg-green-50 border-green-200' :
          overallStatus.status === 'testing' ? 'bg-blue-50 border-blue-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {overallStatus.status === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : overallStatus.status === 'testing' ? (
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div>
              <h3 className={`font-semibold ${
                overallStatus.status === 'success' ? 'text-green-800' :
                overallStatus.status === 'testing' ? 'text-blue-800' :
                'text-red-800'
              }`}>
                {overallStatus.message}
              </h3>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Results</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Database Connection</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.connection)}
                <span className={`text-sm font-medium ${
                  testResults.connection === 'success' ? 'text-green-600' :
                  testResults.connection === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {getStatusText(testResults.connection)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Authentication Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.authentication)}
                <span className={`text-sm font-medium ${
                  testResults.authentication === 'success' ? 'text-green-600' :
                  testResults.authentication === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {getStatusText(testResults.authentication)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Read Access</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.readAccess)}
                <span className={`text-sm font-medium ${
                  testResults.readAccess === 'success' ? 'text-green-600' :
                  testResults.readAccess === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {getStatusText(testResults.readAccess)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Write Access</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.writeAccess)}
                <span className={`text-sm font-medium ${
                  testResults.writeAccess === 'success' ? 'text-green-600' :
                  testResults.writeAccess === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {getStatusText(testResults.writeAccess)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">Global Persistence</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.globalPersistence)}
                <span className={`text-sm font-medium ${
                  testResults.globalPersistence === 'success' ? 'text-green-600' :
                  testResults.globalPersistence === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {getStatusText(testResults.globalPersistence)}
                </span>
              </div>
            </div>
          </div>

          {/* Global Persistence Explanation */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🌍 Global Persistence Test</h4>
            <p className="text-sm text-blue-700">
              This test verifies that changes made in the admin panel are saved to the global database 
              and will be visible to ALL users worldwide, not just your local browser.
            </p>
            {testResults.globalPersistence === 'success' && (
              <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
                ✅ <strong>Confirmed:</strong> Your admin panel changes WILL be visible to everyone!
              </div>
            )}
            {testResults.globalPersistence === 'failed' && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                ❌ <strong>Warning:</strong> Changes may only be visible locally. Check authentication and database setup.
              </div>
            )}
          </div>

          {/* Error Details */}
          {errorDetails && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
              <pre className="text-sm text-red-700 whitespace-pre-wrap">{errorDetails}</pre>
            </div>
          )}

          {/* Test Data Preview */}
          {testData && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Current Database Content</h4>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(testData, null, 2).substring(0, 500)}...
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={runDatabaseTests}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Run Tests Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTestPanel;