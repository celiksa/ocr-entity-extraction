import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, Loader2, FileText, Download, ChevronRight, ChevronDown, Folder, FolderOpen, User, Building2, Calendar, DollarSign, MapPin, Hash, Phone, Package, Tag } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
}

interface SampleStructure {
  structure: FileNode;
}

interface Entity {
  name?: string;
  value?: string;
  role?: string;
  type?: string;
  full_address?: string;
  description?: string;
  quantity?: string;
  unit_price?: string;
  total?: string;
  currency?: string;
  entity?: string;
}

interface Entities {
  people?: Entity[];
  organizations?: Entity[];
  dates?: Entity[];
  amounts?: Entity[];
  addresses?: Entity[];
  identifiers?: Entity[];
  contact_info?: Entity[];
  items?: Entity[];
  other_entities?: Entity[];
}

interface OCRResult {
  document_type: string;
  total_pages?: number;
  entities?: Entities;
  metadata: {
    language: string;
    confidence: string;
    document_condition?: string;
    special_elements: string[];
    page_results?: Array<{
      page_number: number;
      error?: string;
      document_type?: string;
      entities?: Entities;
      metadata?: {
        language: string;
        confidence: string;
        document_condition?: string;
        special_elements: string[];
      };
    }>;
  };
}

interface ProcessingResult {
  success: boolean;
  filename: string;
  result: OCRResult;
}

// Tree Node Component
const TreeNode: React.FC<{
  node: FileNode;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  level?: number;
}> = ({ node, selectedFile, onFileSelect, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  
  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };
  
  const getFileIcon = (filename: string) => {
    if (filename.toLowerCase().endsWith('.pdf')) {
      return <FileText size={18} style={{ color: '#dc2626' }} />;
    }
    return <FileImage size={18} style={{ color: '#3b82f6' }} />;
  };
  
  return (
    <div className="tree-node">
      <div
        className={`tree-item ${node.type === 'file' && selectedFile === node.path ? 'selected' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {node.type === 'folder' && (
          isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        )}
        {node.type === 'folder' ? (
          isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />
        ) : (
          getFileIcon(node.name)
        )}
        <span className="tree-item-name">{node.name}</span>
        {node.size && (
          <span className="tree-item-size">{(node.size / 1024).toFixed(1)} KB</span>
        )}
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div className="tree-children">
          {node.children.map((child, index) => (
            <TreeNode
              key={index}
              node={child}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Entity Display Component
const EntityDisplay: React.FC<{ entities: Entities }> = ({ entities }) => {
  const entityConfig = [
    { key: 'people', icon: User, label: 'People', color: '#3b82f6' },
    { key: 'organizations', icon: Building2, label: 'Organizations', color: '#8b5cf6' },
    { key: 'dates', icon: Calendar, label: 'Dates', color: '#10b981' },
    { key: 'amounts', icon: DollarSign, label: 'Amounts', color: '#f59e0b' },
    { key: 'addresses', icon: MapPin, label: 'Addresses', color: '#ef4444' },
    { key: 'identifiers', icon: Hash, label: 'Identifiers', color: '#6366f1' },
    { key: 'contact_info', icon: Phone, label: 'Contact Info', color: '#ec4899' },
    { key: 'items', icon: Package, label: 'Items', color: '#14b8a6' },
    { key: 'other_entities', icon: Tag, label: 'Other', color: '#64748b' }
  ];

  const renderEntityValue = (entity: Entity, type: string) => {
    switch (type) {
      case 'people':
        return (
          <>
            <span className="entity-main">{entity.name}</span>
            {entity.role && <span className="entity-sub">{entity.role}</span>}
          </>
        );
      case 'organizations':
        return (
          <>
            <span className="entity-main">{entity.name}</span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      case 'dates':
        return (
          <>
            <span className="entity-main">{entity.value}</span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      case 'amounts':
        return (
          <>
            <span className="entity-main">
              {entity.currency} {entity.value}
            </span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      case 'addresses':
        return (
          <>
            <span className="entity-main">{entity.full_address}</span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      case 'identifiers':
        return (
          <>
            <span className="entity-main">{entity.value}</span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      case 'contact_info':
        return (
          <>
            <span className="entity-main">{entity.value}</span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      case 'items':
        return (
          <div className="entity-item">
            <span className="entity-main">{entity.description}</span>
            <div className="entity-item-details">
              {entity.quantity && <span>Qty: {entity.quantity}</span>}
              {entity.unit_price && <span>Price: {entity.unit_price}</span>}
              {entity.total && <span>Total: {entity.total}</span>}
            </div>
          </div>
        );
      case 'other_entities':
        return (
          <>
            <span className="entity-main">{entity.entity}: {entity.value}</span>
            {entity.type && <span className="entity-sub">{entity.type}</span>}
          </>
        );
      default:
        return <span className="entity-main">{JSON.stringify(entity)}</span>;
    }
  };

  return (
    <div className="entities-grid">
      {entityConfig.map(({ key, icon: Icon, label, color }) => {
        const entityList = entities[key as keyof Entities];
        if (!entityList || entityList.length === 0) return null;

        return (
          <motion.div
            key={key}
            className="entity-category"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="entity-header" style={{ borderColor: color }}>
              <Icon size={20} style={{ color }} />
              <h4>{label}</h4>
              <span className="entity-count">{entityList.length}</span>
            </div>
            <div className="entity-list">
              {entityList.map((entity, index) => (
                <motion.div
                  key={index}
                  className="entity-item-wrapper"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {renderEntityValue(entity, key)}
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [sampleStructure, setSampleStructure] = useState<FileNode | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'samples' | 'upload'>('samples');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  React.useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/samples`);
      setSampleStructure(response.data.structure);
    } catch (err) {
      console.error('Error fetching samples:', err);
    }
  };

  const processSampleImage = async (filename: string) => {
    setProcessing(true);
    setError(null);
    setSelectedFile(filename);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ocr/sample/${filename}`);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error processing image');
      setResult(null);
    } finally {
      setProcessing(false);
    }
  };

  const processUploadedImage = async (file: File) => {
    setProcessing(true);
    setError(null);
    setSelectedFile(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ocr/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error processing image');
      setResult(null);
    } finally {
      setProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processUploadedImage(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'application/pdf': ['.pdf']
    },
    multiple: false,
  });

  const downloadResults = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result.result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ocr-results-${selectedFile?.replace(/\.[^/.]+$/, '')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Document Intelligence OCR</h1>
        <p>Extract and structure text from your documents</p>
      </header>

      <div className="main-content">
        {/* Left Panel - Input */}
        <div className="left-panel">
          <div className="panel-header">
            <h2>Input Document</h2>
          </div>
          
          <div className="input-tabs">
            <button
              className={`input-tab ${activeTab === 'samples' ? 'active' : ''}`}
              onClick={() => setActiveTab('samples')}
            >
              <FileImage size={16} />
              Samples
            </button>
            <button
              className={`input-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={16} />
              Upload
            </button>
          </div>

          <div className="input-content">
            {activeTab === 'samples' ? (
              <div className="samples-container">
                <p className="section-description">Select from sample documents</p>
                <div className="samples-tree">
                  {sampleStructure && sampleStructure.children && sampleStructure.children.length > 0 ? (
                    sampleStructure.children.map((child, index) => (
                      <TreeNode
                        key={index}
                        node={child}
                        selectedFile={selectedFile}
                        onFileSelect={processSampleImage}
                      />
                    ))
                  ) : (
                    <p className="no-samples">No sample files found</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="upload-container">
                <div
                  {...getRootProps()}
                  className={`upload-zone ${isDragActive ? 'active' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload size={48} />
                  <h3>Drop your document here</h3>
                  <p>or click to browse</p>
                  <p className="file-types">PNG, JPG, JPEG, GIF, BMP, PDF</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="right-panel">
          <div className="panel-header">
            <h2>Extraction Results</h2>
            {result && (
              <div className="result-actions">
                <button className="action-btn" onClick={downloadResults}>
                  <Download size={16} />
                  Export JSON
                </button>
              </div>
            )}
          </div>

          <div className="results-content">
            {processing && (
              <div className="processing-state">
                <Loader2 className="spinner" size={48} />
                <p>Analyzing document...</p>
              </div>
            )}

            {error && !processing && (
              <div className="error-state">
                <p className="error-message">{error}</p>
              </div>
            )}

            {!processing && !error && !result && (
              <div className="empty-state">
                <FileText size={64} className="empty-icon" />
                <p>Select or upload a document to begin</p>
              </div>
            )}

            {result && !processing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="results-grid"
              >
                <div className="result-card">
                  <h3>Document Overview</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Type</span>
                      <span className="value">{result.result.document_type}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Language</span>
                      <span className="value">{result.result.metadata.language}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Confidence</span>
                      <span className={`value confidence-${result.result.metadata.confidence}`}>
                        {result.result.metadata.confidence}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">File</span>
                      <span className="value">{result.filename}</span>
                    </div>
                    {result.result.total_pages && (
                      <div className="info-item">
                        <span className="label">Pages</span>
                        <span className="value">{result.result.total_pages}</span>
                      </div>
                    )}
                  </div>
                </div>

                {result.result.entities && (
                  <div className="result-card entities-card">
                    <h3>Extracted Entities</h3>
                    <EntityDisplay entities={result.result.entities} />
                  </div>
                )}


                {result.result.metadata.special_elements.length > 0 && (
                  <div className="result-card">
                    <h3>Detected Elements</h3>
                    <div className="elements-list">
                      {result.result.metadata.special_elements.map((element, index) => (
                        <span key={index} className="element-tag">{element}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.result.metadata.page_results && (
                  <div className="result-card">
                    <h3>Page Analysis</h3>
                    <div className="page-results">
                      {result.result.metadata.page_results.map((page: any, index: number) => (
                        <div key={index} className="page-result">
                          <h4>Page {page.page_number}</h4>
                          {page.error ? (
                            <p className="page-error">Error: {page.error}</p>
                          ) : (
                            <p className="page-summary">
                              Type: {page.document_type} | 
                              Language: {page.metadata?.language} | 
                              Confidence: {page.metadata?.confidence}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
