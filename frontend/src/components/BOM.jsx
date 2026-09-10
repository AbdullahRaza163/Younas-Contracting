import React, { useState } from 'react';
import {
  Package,
  ClipboardList,
  TrendingUp as TrendingUpIcon,
  Edit,
  Trash2,
  PlusCircle,
  Save,
  X
} from 'lucide-react';
import Utils from '../utils/Utils';
import './BOM.css'
const BOMComponent = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState('materials');
  const [materialForm, setMaterialForm] = useState({
    name: '',
    category: 'Construction',
    unit: 'kg',
    unitPrice: '',
    quantity: '',
    supplier: '',
    reorderLevel: ''
  });
  const [bomForm, setBomForm] = useState({
    projectName: '',
    siteId: '',
    materials: [],
    estimatedHours: '',
    labourCost: '',
    overheadPercentage: '10'
  });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [predictionParams, setPredictionParams] = useState({
    projectType: 'residential',
    area: '',
    floors: '1',
    materialType: 'all'
  });
  const [predictionResult, setPredictionResult] = useState(null);

  const categories = [
    'Construction', 'Steel', 'Cement', 'Sand', 'Gravel', 'Wood',
    'Electrical', 'Plumbing', 'Finishing', 'Painting', 'Glass', 'Insulation'
  ];

  const units = ['kg', 'ton', 'm3', 'm2', 'liters', 'pieces', 'rolls', 'sheets'];

  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (!materialForm.name) return;

    const material = {
      id: editingMaterial || Date.now().toString(),
      ...materialForm,
      unitPrice: parseFloat(materialForm.unitPrice) || 0,
      quantity: parseFloat(materialForm.quantity) || 0,
      reorderLevel: parseFloat(materialForm.reorderLevel) || 0,
      createdAt: new Date().toISOString()
    };

    let updatedMaterials;
    if (editingMaterial) {
      updatedMaterials = data.materials.map(m =>
        m.id === editingMaterial ? material : m
      );
    } else {
      updatedMaterials = [...(data.materials || []), material];
    }

    updateData({ materials: updatedMaterials });
    setMaterialForm({ name: '', category: 'Construction', unit: 'kg', unitPrice: '', quantity: '', supplier: '', reorderLevel: '' });
    setEditingMaterial(null);
  };

  const deleteMaterial = (id) => {
    if (window.confirm('Delete this material?')) {
      updateData({ materials: data.materials.filter(m => m.id !== id) });
    }
  };

  const addMaterialToBOM = (material) => {
    setBomForm(prev => ({
      ...prev,
      materials: [...prev.materials, {
        materialId: material.id,
        name: material.name,
        unit: material.unit,
        unitPrice: material.unitPrice,
        quantity: 1,
        totalCost: material.unitPrice
      }]
    }));
  };

  const removeFromBOM = (index) => {
    setBomForm(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const updateBOMQuantity = (index, quantity) => {
    setBomForm(prev => {
      const updated = [...prev.materials];
      updated[index].quantity = parseFloat(quantity) || 0;
      updated[index].totalCost = updated[index].unitPrice * updated[index].quantity;
      return { ...prev, materials: updated };
    });
  };

  const saveBOM = (e) => {
    e.preventDefault();
    if (!bomForm.projectName) return;

    const totalMaterialCost = bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0);
    const labourCost = parseFloat(bomForm.labourCost) || 0;
    const overhead = (totalMaterialCost + labourCost) * (parseFloat(bomForm.overheadPercentage) / 100);
    const totalCost = totalMaterialCost + labourCost + overhead;

    const bom = {
      id: Date.now().toString(),
      ...bomForm,
      totalMaterialCost,
      labourCost,
      overhead,
      totalCost,
      createdAt: new Date().toISOString()
    };

    updateData({ bom: [...(data.bom || []), bom] });
    setBomForm({
      projectName: '',
      siteId: '',
      materials: [],
      estimatedHours: '',
      labourCost: '',
      overheadPercentage: '10'
    });
  };

  const generatePrediction = () => {
    const { projectType, area, floors, materialType } = predictionParams;
    const areaNum = parseFloat(area) || 0;
    const floorsNum = parseInt(floors) || 1;

    const materialRates = {
      residential: {
        cement: 0.15,
        steel: 0.08,
        sand: 0.12,
        gravel: 0.10,
        wood: 0.05,
        bricks: 50
      },
      commercial: {
        cement: 0.20,
        steel: 0.12,
        sand: 0.15,
        gravel: 0.12,
        wood: 0.03,
        bricks: 40
      },
      industrial: {
        cement: 0.25,
        steel: 0.18,
        sand: 0.10,
        gravel: 0.15,
        wood: 0.02,
        bricks: 30
      }
    };

    const rates = materialRates[projectType] || materialRates.residential;
    const totalArea = areaNum * floorsNum;

    const prediction = {
      projectType,
      totalArea,
      floors: floorsNum,
      materials: {
        cement: { quantity: rates.cement * totalArea, unit: 'tons' },
        steel: { quantity: rates.steel * totalArea, unit: 'tons' },
        sand: { quantity: rates.sand * totalArea, unit: 'm3' },
        gravel: { quantity: rates.gravel * totalArea, unit: 'm3' },
        wood: { quantity: rates.wood * totalArea, unit: 'm3' },
        bricks: { quantity: Math.round(rates.bricks * totalArea), unit: 'pieces' }
      },
      estimatedCost: 0,
      laborHours: totalArea * 2.5,
      timeline: Math.ceil(totalArea / 100)
    };

    const materials = data.materials || [];
    let totalCost = 0;
    Object.keys(prediction.materials).forEach(key => {
      const material = materials.find(m =>
        m.category.toLowerCase() === key ||
        m.name.toLowerCase().includes(key)
      );
      if (material) {
        const cost = prediction.materials[key].quantity * material.unitPrice;
        prediction.materials[key].cost = cost;
        totalCost += cost;
      } else {
        const avgPrice = 50;
        prediction.materials[key].cost = prediction.materials[key].quantity * avgPrice;
        totalCost += prediction.materials[key].quantity * avgPrice;
        prediction.materials[key].estimatedPrice = true;
      }
    });

    prediction.estimatedCost = totalCost;

    if (materialType !== 'all') {
      const filtered = {};
      Object.keys(prediction.materials).forEach(key => {
        if (key === materialType || key.includes(materialType)) {
          filtered[key] = prediction.materials[key];
        }
      });
      prediction.materials = filtered;
    }

    setPredictionResult(prediction);
  };

  return (
    <div className="bom-modern">
      <h2>Bill of Materials & Prediction</h2>

      <div className="bom-tabs">
        <button
          className={`bom-tab ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          <Package size={18} /> Materials
        </button>
        <button
          className={`bom-tab ${activeTab === 'bom' ? 'active' : ''}`}
          onClick={() => setActiveTab('bom')}
        >
          <ClipboardList size={18} /> BOM
        </button>
        <button
          className={`bom-tab ${activeTab === 'prediction' ? 'active' : ''}`}
          onClick={() => setActiveTab('prediction')}
        >
          <TrendingUpIcon size={18} /> Prediction
        </button>
      </div>

      {activeTab === 'materials' && (
        <div className="materials-section">
          <div className="material-form">
            <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
            <form onSubmit={handleMaterialSubmit}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Material Name *</label>
                  <input
                    type="text"
                    value={materialForm.name}
                    onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                    placeholder="Enter material name"
                    required
                  />
                </div>
                <div className="form-group-modern">
                  <label>Category</label>
                  <select
                    value={materialForm.category}
                    onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Unit</label>
                  <select
                    value={materialForm.unit}
                    onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })}
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group-modern">
                  <label>Unit Price (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={materialForm.unitPrice}
                    onChange={e => setMaterialForm({ ...materialForm, unitPrice: e.target.value })}
                    placeholder="0.000"
                  />
                </div>
              </div>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Current Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.quantity}
                    onChange={e => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.reorderLevel}
                    onChange={e => setMaterialForm({ ...materialForm, reorderLevel: e.target.value })}
                    placeholder="Reorder at"
                  />
                </div>
              </div>
              <div className="form-group-modern">
                <label>Supplier</label>
                <input
                  type="text"
                  value={materialForm.supplier}
                  onChange={e => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <button type="submit" className="btn-primary-modern">
                {editingMaterial ? 'Update' : 'Add'} Material
              </button>
              {editingMaterial && (
                <button type="button" className="btn-secondary-modern" onClick={() => {
                  setEditingMaterial(null);
                  setMaterialForm({ name: '', category: 'Construction', unit: 'kg', unitPrice: '', quantity: '', supplier: '', reorderLevel: '' });
                }}>
                  Cancel
                </button>
              )}
            </form>
          </div>

          <div className="materials-list">
            <h3>Material Inventory</h3>
            <div className="materials-grid">
              {(data.materials || []).map(material => (
                <div key={material.id} className="material-card">
                  <div className="material-card-header">
                    <div className="material-name">{material.name}</div>
                    <div className="material-category">{material.category}</div>
                  </div>
                  <div className="material-details">
                    <div className="material-detail">
                      <span className="label">Qty:</span>
                      <span className="value">{material.quantity} {material.unit}</span>
                    </div>
                    <div className="material-detail">
                      <span className="label">Price:</span>
                      <span className="value">{Utils.formatCurrency(material.unitPrice)}</span>
                    </div>
                    {material.supplier && (
                      <div className="material-detail">
                        <span className="label">Supplier:</span>
                        <span className="value">{material.supplier}</span>
                      </div>
                    )}
                    {material.reorderLevel > 0 && material.quantity <= material.reorderLevel && (
                      <div className="material-low-stock">⚠️ Low Stock - Reorder!</div>
                    )}
                  </div>
                  <div className="material-actions">
                    <button className="btn-small-modern" onClick={() => {
                      setEditingMaterial(material.id);
                      setMaterialForm(material);
                    }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button className="btn-small-modern" onClick={() => addMaterialToBOM(material)}>
                      <PlusCircle size={14} /> Add to BOM
                    </button>
                    <button className="btn-small-modern danger" onClick={() => deleteMaterial(material.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {(data.materials || []).length === 0 && (
                <div className="empty-state-modern">No materials added yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="bom-section">
          <div className="bom-form">
            <h3>Create Bill of Materials</h3>
            <form onSubmit={saveBOM}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={bomForm.projectName}
                    onChange={e => setBomForm({ ...bomForm, projectName: e.target.value })}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="form-group-modern">
                  <label>Site</label>
                  <select
                    value={bomForm.siteId}
                    onChange={e => setBomForm({ ...bomForm, siteId: e.target.value })}
                  >
                    <option value="">Select Site</option>
                    {data.sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bom-materials-list">
                <h4>Materials</h4>
                {bomForm.materials.map((mat, index) => (
                  <div key={index} className="bom-material-item">
                    <div className="bom-material-info">
                      <span className="material-name">{mat.name}</span>
                      <span className="material-unit">{mat.unit}</span>
                    </div>
                    <div className="bom-material-controls">
                      <input
                        type="number"
                        step="0.01"
                        value={mat.quantity}
                        onChange={e => updateBOMQuantity(index, e.target.value)}
                        style={{ width: '80px' }}
                      />
                      <span className="material-cost">{Utils.formatCurrency(mat.totalCost)}</span>
                      <button className="btn-small-modern danger" onClick={() => removeFromBOM(index)}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {bomForm.materials.length === 0 && (
                  <div className="empty-state-modern">No materials added. Add from Materials tab.</div>
                )}
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={bomForm.estimatedHours}
                    onChange={e => setBomForm({ ...bomForm, estimatedHours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Labour Cost (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={bomForm.labourCost}
                    onChange={e => setBomForm({ ...bomForm, labourCost: e.target.value })}
                    placeholder="0.000"
                  />
                </div>
              </div>
              <div className="form-group-modern">
                <label>Overhead Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bomForm.overheadPercentage}
                  onChange={e => setBomForm({ ...bomForm, overheadPercentage: e.target.value })}
                  placeholder="10"
                />
              </div>

              {bomForm.materials.length > 0 && (
                <div className="bom-summary">
                  <div className="bom-summary-item">
                    <span>Material Cost:</span>
                    <span>{Utils.formatCurrency(bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0))}</span>
                  </div>
                  <div className="bom-summary-item">
                    <span>Labour Cost:</span>
                    <span>{Utils.formatCurrency(parseFloat(bomForm.labourCost) || 0)}</span>
                  </div>
                  <div className="bom-summary-item">
                    <span>Overhead ({bomForm.overheadPercentage}%):</span>
                    <span>{Utils.formatCurrency(
                      (bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0) + (parseFloat(bomForm.labourCost) || 0)) *
                      (parseFloat(bomForm.overheadPercentage) / 100)
                    )}</span>
                  </div>
                  <div className="bom-summary-item total">
                    <span><strong>Total Cost:</strong></span>
                    <span><strong>{Utils.formatCurrency(
                      bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0) +
                      (parseFloat(bomForm.labourCost) || 0) +
                      (bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0) + (parseFloat(bomForm.labourCost) || 0)) *
                      (parseFloat(bomForm.overheadPercentage) / 100)
                    )}</strong></span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary-modern">
                <Save size={16} /> Save BOM
              </button>
            </form>
          </div>

          <div className="saved-boms">
            <h3>Saved BOMs</h3>
            {(data.bom || []).map(bom => (
              <div key={bom.id} className="bom-card">
                <div className="bom-card-header">
                  <div className="bom-project-name">{bom.projectName}</div>
                  <div className="bom-date">{Utils.formatDate(bom.createdAt)}</div>
                </div>
                <div className="bom-card-details">
                  <div className="bom-detail">
                    <span>Materials:</span>
                    <span>{bom.materials.length} items</span>
                  </div>
                  <div className="bom-detail">
                    <span>Total Cost:</span>
                    <span className="bom-total">{Utils.formatCurrency(bom.totalCost)}</span>
                  </div>
                </div>
              </div>
            ))}
            {(data.bom || []).length === 0 && (
              <div className="empty-state-modern">No BOMs saved yet</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prediction' && (
        <div className="prediction-section">
          <h3>Material Prediction Engine</h3>
          <div className="prediction-form">
            <div className="form-row-modern">
              <div className="form-group-modern">
                <label>Project Type</label>
                <select
                  value={predictionParams.projectType}
                  onChange={e => setPredictionParams({ ...predictionParams, projectType: e.target.value })}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div className="form-group-modern">
                <label>Area (m²)</label>
                <input
                  type="number"
                  value={predictionParams.area}
                  onChange={e => setPredictionParams({ ...predictionParams, area: e.target.value })}
                  placeholder="Enter area in m²"
                />
              </div>
            </div>
            <div className="form-row-modern">
              <div className="form-group-modern">
                <label>Floors</label>
                <input
                  type="number"
                  value={predictionParams.floors}
                  onChange={e => setPredictionParams({ ...predictionParams, floors: e.target.value })}
                  placeholder="1"
                  min="1"
                />
              </div>
              <div className="form-group-modern">
                <label>Material Type</label>
                <select
                  value={predictionParams.materialType}
                  onChange={e => setPredictionParams({ ...predictionParams, materialType: e.target.value })}
                >
                  <option value="all">All Materials</option>
                  <option value="cement">Cement</option>
                  <option value="steel">Steel</option>
                  <option value="sand">Sand</option>
                  <option value="gravel">Gravel</option>
                  <option value="wood">Wood</option>
                  <option value="bricks">Bricks</option>
                </select>
              </div>
            </div>
            <button className="btn-primary-modern" onClick={generatePrediction}>
              <TrendingUpIcon size={16} /> Generate Prediction
            </button>
          </div>

          {predictionResult && (
            <div className="prediction-result">
              <div className="prediction-summary">
                <div className="prediction-item">
                  <span className="label">Project Type</span>
                  <span className="value">{predictionResult.projectType}</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Total Area</span>
                  <span className="value">{predictionResult.totalArea.toFixed(1)} m²</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Floors</span>
                  <span className="value">{predictionResult.floors}</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Estimated Cost</span>
                  <span className="value highlight">{Utils.formatCurrency(predictionResult.estimatedCost)}</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Labor Hours</span>
                  <span className="value">{predictionResult.laborHours.toFixed(1)} hrs</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Project Timeline</span>
                  <span className="value">{predictionResult.timeline} days</span>
                </div>
              </div>

              <div className="prediction-materials">
                <h4>Required Materials</h4>
                <div className="materials-prediction-grid">
                  {Object.entries(predictionResult.materials).map(([key, value]) => (
                    <div key={key} className="material-prediction-item">
                      <div className="material-name">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                      <div className="material-quantity">{value.quantity.toFixed(2)} {value.unit}</div>
                      {value.cost && (
                        <div className="material-cost">
                          {Utils.formatCurrency(value.cost)}
                          {value.estimatedPrice && <span className="estimated-badge">*</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {predictionResult.materials.estimatedPrice && (
                  <div className="estimation-note">* Estimated based on average prices</div>
                )}
              </div>

              <div className="prediction-actions">
                <button className="btn-secondary-modern" onClick={() => {
                  const materials = data.materials || [];
                  Object.entries(predictionResult.materials).forEach(([key, value]) => {
                    const existing = materials.find(m =>
                      m.name.toLowerCase().includes(key)
                    );
                    if (!existing) {
                      materials.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        category: 'Construction',
                        unit: value.unit,
                        unitPrice: 50,
                        quantity: 0,
                        supplier: '',
                        reorderLevel: value.quantity * 0.2
                      });
                    }
                  });
                  updateData({ materials });
                  alert('Predicted materials added to inventory!');
                }}>
                  <PlusCircle size={16} /> Add to Inventory
                </button>
                <button className="btn-primary-modern" onClick={() => {
                  const materials = Object.entries(predictionResult.materials).map(([key, value]) => ({
                    materialId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    unit: value.unit,
                    unitPrice: value.cost ? value.cost / value.quantity : 50,
                    quantity: value.quantity,
                    totalCost: value.cost || value.quantity * 50
                  }));

                  const bom = {
                    id: Date.now().toString(),
                    projectName: `${predictionResult.projectType} Project - ${Utils.today()}`,
                    siteId: '',
                    materials: materials,
                    estimatedHours: predictionResult.laborHours.toString(),
                    labourCost: (predictionResult.laborHours * 8).toString(),
                    overheadPercentage: '10',
                    totalMaterialCost: predictionResult.estimatedCost,
                    overhead: predictionResult.estimatedCost * 0.1,
                    totalCost: predictionResult.estimatedCost * 1.1,
                    createdAt: new Date().toISOString()
                  };

                  updateData({ bom: [...(data.bom || []), bom] });
                  alert('BOM created from prediction!');
                }}>
                  <ClipboardList size={16} /> Create BOM
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BOMComponent;