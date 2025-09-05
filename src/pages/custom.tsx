import React, { useState, useEffect } from 'react';
import { PlusCircle, Eye, Edit, Trash2, Download, Users, MousePointer, Clock, X } from 'lucide-react';

const FormBuilderApp = () => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, createForm, responses, formBuilder
  const [forms, setForms] = useState([
    {
      id: 'dk',
      title: 'Customer Feedback Form',
      status: 'active',
      created: '2024-09-01',
      responses: [
        {
          id: 1,
          submissionDate: '2024-09-04 10:30:00',
          company: 'TechCorp',
          userId: 'user123',
          companyName: 'TechCorp Solutions',
          formStatus: 'completed',
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'summer2024',
          utmContent: 'ad1',
          utmTerm: 'software',
          actualIP: '192.168.1.1',
          sessionIP: '192.168.1.1',
          conversionIP: '192.168.1.1',
          suspicious: 'No',
          rejected: 'No',
          customField: 'Looking for new software',
          responses: {
            name: 'John Doe',
            email: 'john@techcorp.com',
            feedback: 'Great service, very satisfied!'
          }
        },
        {
          id: 2,
          submissionDate: '2024-09-03 14:20:00',
          company: 'StartupXYZ',
          userId: 'user456',
          companyName: 'StartupXYZ Inc',
          formStatus: 'completed',
          utmSource: 'facebook',
          utmMedium: 'social',
          utmCampaign: 'awareness',
          utmContent: 'post1',
          utmTerm: 'business',
          actualIP: '10.0.0.1',
          sessionIP: '10.0.0.1',
          conversionIP: '10.0.0.1',
          suspicious: 'No',
          rejected: 'No',
          customField: 'Need pricing info',
          responses: {
            name: 'Jane Smith',
            email: 'jane@startupxyz.com',
            feedback: 'Good product, but expensive'
          }
        },
        {
          id: 3,
          submissionDate: '2024-09-02 09:15:00',
          company: 'Enterprise Ltd',
          userId: 'user789',
          companyName: 'Enterprise Solutions Ltd',
          formStatus: 'partial',
          utmSource: 'email',
          utmMedium: 'newsletter',
          utmCampaign: 'monthly',
          utmContent: 'link1',
          utmTerm: 'enterprise',
          actualIP: '172.16.0.1',
          sessionIP: '172.16.0.1',
          conversionIP: '172.16.0.1',
          suspicious: 'Yes',
          rejected: 'Yes',
          customField: 'Suspicious activity detected',
          responses: {
            name: 'Bob Wilson',
            email: 'bob@enterprise.com',
            feedback: 'Incomplete response'
          }
        }
      ]
    }
  ]);
  const [selectedForm, setSelectedForm] = useState('dk');
  const [newForm, setNewForm] = useState({ title: '', fields: [] });
  const [showFormPreview, setShowFormPreview] = useState(false);

  // Get current form data
  const getCurrentForm = () => forms.find(f => f.id === selectedForm);
  const currentForm = getCurrentForm();

  // Dashboard View
  const DashboardView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Form Dashboard</h1>
        <button 
          onClick={() => setCurrentView('createForm')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusCircle size={20} />
          <span>Create New Form</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {forms.map(form => (
          <div key={form.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{form.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                form.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {form.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Responses:</span>
                <span className="font-medium">{form.responses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{form.created}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={() => {setSelectedForm(form.id); setCurrentView('responses');}}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
              >
                <Eye size={16} />
                <span>View</span>
              </button>
              <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1">
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Create Form View
  const CreateFormView = () => {
    const [formTitle, setFormTitle] = useState('');
    const [fields, setFields] = useState([]);

    const addField = (type) => {
      setFields([...fields, {
        id: Date.now(),
        type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
        required: false
      }]);
    };

    const removeField = (id) => {
      setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id, updates) => {
      setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const saveForm = () => {
      if (!formTitle.trim()) return;
      
      const newForm = {
        id: formTitle.toLowerCase().replace(/\s+/g, '-'),
        title: formTitle,
        status: 'active',
        created: new Date().toISOString().split('T')[0],
        fields,
        responses: []
      };

      setForms([...forms, newForm]);
      setCurrentView('dashboard');
      setFormTitle('');
      setFields([]);
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Form</h1>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="text-gray-600 hover:text-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Form Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter form title"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Fields</label>
            <div className="flex space-x-2 mb-4">
              <button onClick={() => addField('text')} className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">Text</button>
              <button onClick={() => addField('email')} className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">Email</button>
              <button onClick={() => addField('textarea')} className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">Textarea</button>
              <button onClick={() => addField('select')} className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm">Select</button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {fields.map(field => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="font-medium text-gray-900 border-none bg-transparent focus:outline-none"
                  />
                  <button
                    onClick={() => removeField(field.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Type: {field.type}</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="mr-1"
                    />
                    <span className="text-sm">Required</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={saveForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Save Form
            </button>
            <button
              onClick={() => setShowFormPreview(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Preview Form
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Responses View (Original Dashboard)
  const ResponsesView = () => {
    const exportToCSV = () => {
      const headers = ['Submission Date', 'Company', 'User ID', 'Company Name', 'Form Status', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term', 'Actual IP', 'Session IP', 'Conversion IP', 'Suspicious', 'Rejected', 'Custom Field'];
      const rows = currentForm.responses.map(r => [
        r.submissionDate, r.company, r.userId, r.companyName, r.formStatus,
        r.utmSource, r.utmMedium, r.utmCampaign, r.utmContent, r.utmTerm,
        r.actualIP, r.sessionIP, r.conversionIP, r.suspicious, r.rejected, r.customField
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedForm}_responses.csv`;
      a.click();
    };

    const exportToJSON = () => {
      if (currentForm.responses.length === 0) {
        alert('No responses to export');
        return;
      }

      const jsonContent = JSON.stringify(currentForm.responses, null, 2);
      
      try {
        // Method 1: Try using navigator.clipboard if available
        if (navigator.clipboard) {
          navigator.clipboard.writeText(jsonContent).then(() => {
            alert('JSON data copied to clipboard! Paste it into a text editor and save as .json file');
          }).catch(() => {
            // Fallback to method 2
            copyJSONToClipboardFallback(jsonContent);
          });
        } else {
          copyJSONToClipboardFallback(jsonContent);
        }
      } catch (error) {
        // Method 3: Show in modal if all else fails
        showJSONModal(jsonContent);
      }
    };

    const copyJSONToClipboardFallback = (text) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        alert('JSON data copied to clipboard! Paste it into a text editor and save as .json file');
      } catch (err) {
        showJSONModal(text);
      }
      
      document.body.removeChild(textArea);
    };

    const showJSONModal = (jsonContent) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
        background: rgba(0,0,0,0.5); z-index: 1000; 
        display: flex; align-items: center; justify-content: center;
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: white; padding: 20px; border-radius: 8px; 
        max-width: 80%; max-height: 80%; overflow: auto;
      `;
      
      content.innerHTML = `
        <h3 style="margin-top: 0;">JSON Export Data</h3>
        <p>Copy the text below and save it as a .json file:</p>
        <textarea readonly style="width: 100%; height: 300px; font-family: monospace;">${jsonContent}</textarea>
        <br><br>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: #10b981; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          Close
        </button>
      `;
      
      modal.appendChild(content);
      document.body.appendChild(modal);
    };

    const toggleFormStatus = () => {
      setForms(forms.map(f => 
        f.id === selectedForm 
          ? { ...f, status: f.status === 'active' ? 'closed' : 'active' }
          : f
      ));
    };

    if (!currentForm) {
      return (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="text-gray-400 mb-4">
              <Users size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Form not found</h3>
            <p className="text-gray-600 mb-4">The form you're looking for doesn't exist or has been deleted.</p>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="flex justify-end mb-8 space-x-4">
          <button onClick={() => setCurrentView('dashboard')} className="text-gray-600 hover:text-gray-800">Dashboard</button>
          <button onClick={() => setCurrentView('createForm')} className="text-gray-600 hover:text-gray-800">Create Form</button>
          <button className="text-gray-600 hover:text-gray-800">Logout</button>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Title and Close Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-normal text-gray-800">Responses for {selectedForm}</h1>
            <button 
              onClick={toggleFormStatus}
              className={`px-4 py-2 rounded text-sm ${
                currentForm.status === 'active' 
                  ? 'bg-yellow-400 hover:bg-yellow-500 text-black' 
                  : 'bg-green-400 hover:bg-green-500 text-black'
              }`}
            >
              {currentForm.status === 'active' ? 'Close Form' : 'Open Form'}
            </button>
          </div>

          {/* Response Summary */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Response Summary</h2>
              
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Responses</h3>
                  <p className="text-4xl font-light text-gray-800">{currentForm.responses.length}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Gross Clicks</h3>
                  <p className="text-4xl font-light text-gray-800">{currentForm.responses.length * 3}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Latest Response</h3>
                  <p className="text-sm text-gray-500">
                    {currentForm.responses.length > 0 
                      ? currentForm.responses[0].submissionDate 
                      : 'No responses yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Responses */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Detailed Responses</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={exportToCSV}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span>Export to CSV</span>
                  </button>
                  <button 
                    onClick={exportToJSON}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span>Export to JSON</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Medium</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Content</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Term</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suspicious</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Field</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentForm.responses.map((response, index) => (
                    <tr key={response.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.submissionDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.userId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.companyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          response.formStatus === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {response.formStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.utmSource}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.utmMedium}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.utmCampaign}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.utmContent}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.utmTerm}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.actualIP}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.sessionIP}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.conversionIP}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          response.suspicious === 'Yes' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {response.suspicious}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          response.rejected === 'Yes' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {response.rejected}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.customField}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Back to Dashboard Button */}
          <div className="mt-6">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render current view
  const renderCurrentView = () => {
    switch(currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'createForm':
        return <CreateFormView />;
      case 'responses':
        return <ResponsesView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {renderCurrentView()}
    </div>
  );
};

export default FormBuilderApp;