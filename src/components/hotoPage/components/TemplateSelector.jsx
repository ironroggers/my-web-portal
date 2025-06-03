import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Business as BusinessIcon,
  Public as PublicIcon,
  FiberManualRecord as FiberIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Assignment as TemplateIcon
} from '@mui/icons-material';
import { HOTO_TEMPLATES } from '../templates/hotoTemplates';

const TemplateSelector = ({ 
  open, 
  onClose, 
  onTemplateSelect, 
  currentHotoType = "" 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  const getTemplateIcon = (hotoType) => {
    switch (hotoType) {
      case 'block': return <BusinessIcon />;
      case 'gp': return <PublicIcon />;
      case 'ofc': return <FiberIcon />;
      default: return <AddIcon />;
    }
  };

  const getTemplateColor = (hotoType) => {
    switch (hotoType) {
      case 'block': return 'primary';
      case 'gp': return 'secondary'; 
      case 'ofc': return 'success';
      default: return 'default';
    }
  };

  const handleSelectTemplate = (templateKey) => {
    setSelectedTemplate(templateKey);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const template = HOTO_TEMPLATES[selectedTemplate];
      
      // Clone the template fields to avoid mutations
      const templateFields = JSON.parse(JSON.stringify(template.fields));
      
      // Apply the template
      await onTemplateSelect({
        hotoType: template.hotoType,
        fields: templateFields,
        templateName: template.name
      });
      
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedTemplate(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <TemplateIcon color="primary" />
          <Typography variant="h6">Choose HOTO Template</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Select a predefined template to quickly populate your HOTO form with standard fields
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {Object.entries(HOTO_TEMPLATES).map(([key, template]) => (
            <Grid xs={12} sm={6} md={4} key={key}>
              <Card 
                elevation={selectedTemplate === key ? 8 : 2}
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: selectedTemplate === key ? 2 : 1,
                  borderColor: selectedTemplate === key ? 'primary.main' : 'divider',
                  transform: selectedTemplate === key ? 'scale(1.02)' : 'scale(1)',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'scale(1.02)'
                  }
                }}
                onClick={() => handleSelectTemplate(key)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar 
                      sx={{ 
                        bgcolor: `${getTemplateColor(template.hotoType)}.main`,
                        width: 48,
                        height: 48
                      }}
                    >
                      {getTemplateIcon(template.hotoType)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="bold">
                        {template.name}
                      </Typography>
                      {template.hotoType && (
                        <Chip 
                          label={template.hotoType.toUpperCase()} 
                          size="small" 
                          color={getTemplateColor(template.hotoType)}
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                    {selectedTemplate === key && (
                      <CheckIcon color="primary" />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Fields Included:
                    </Typography>
                    <Chip 
                      label={`${template.fields.length} Fields`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  </Box>

                  {template.fields.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        Sample Fields:
                      </Typography>
                      <Box sx={{ 
                        maxHeight: 80, 
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        {template.fields.slice(0, 4).map((field, index) => (
                          <Typography 
                            key={index}
                            variant="caption" 
                            display="block"
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.7rem',
                              lineHeight: 1.2
                            }}
                          >
                            • {field.key.replace(/_/g, ' ')}
                          </Typography>
                        ))}
                        {template.fields.length > 4 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.7rem',
                              fontStyle: 'italic'
                            }}
                          >
                            ... and {template.fields.length - 4} more
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {currentHotoType && currentHotoType !== template.hotoType && template.hotoType && (
                    <Alert severity="warning" sx={{ mt: 2, py: 0.5 }}>
                      <Typography variant="caption">
                        This template will change HOTO type from {currentHotoType.toUpperCase()} to {template.hotoType.toUpperCase()}
                      </Typography>
                    </Alert>
                  )}
                </CardContent>

                <CardActions sx={{ pt: 0, justifyContent: 'center' }}>
                  <Button 
                    size="small" 
                    variant={selectedTemplate === key ? "contained" : "outlined"}
                    color={getTemplateColor(template.hotoType)}
                    fullWidth
                  >
                    {selectedTemplate === key ? "Selected" : "Select Template"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {selectedTemplate && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Template Preview: {HOTO_TEMPLATES[selectedTemplate].name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This template will add {HOTO_TEMPLATES[selectedTemplate].fields.length} predefined fields to your HOTO form. 
              You can modify these fields after applying the template.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleApplyTemplate}
          variant="contained"
          disabled={!selectedTemplate || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
        >
          {loading ? "Applying..." : "Apply Template"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateSelector; 