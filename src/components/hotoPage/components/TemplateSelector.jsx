import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Business as BusinessIcon,
  Public as PublicIcon,
  Cable as CableIcon,
  NoteAdd as BlankIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { HOTO_TEMPLATES } from '../templates/hotoTemplates';
import { getHotoTypeLabel } from '../hotoTypes';

const TEMPLATE_ICONS = { block: BusinessIcon, gp: PublicIcon, ofc: CableIcon };

const TemplateSelector = ({
  open,
  onClose,
  onTemplateSelect,
  currentHotoType = "",
  existingFieldCount = 0,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Start on the template matching the form's HOTO type
  useEffect(() => {
    if (open) {
      setSelectedTemplate(HOTO_TEMPLATES[currentHotoType] ? currentHotoType : null);
    }
  }, [open, currentHotoType]);

  const selected = selectedTemplate ? HOTO_TEMPLATES[selectedTemplate] : null;
  const changesType = Boolean(selected?.hotoType && currentHotoType && currentHotoType !== selected.hotoType);

  const handleApplyTemplate = () => {
    if (!selected) return;
    onTemplateSelect({
      hotoType: selected.hotoType,
      // Clone so edits in the form never touch the shared template
      fields: JSON.parse(JSON.stringify(selected.fields)),
      templateName: selected.name,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          Choose a template
          <Typography variant="body2" component="div" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Templates fill the form with the standard fields for each HOTO type. You can edit them afterwards.
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ mt: -0.5, mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} role="radiogroup" aria-label="Templates">
          {Object.entries(HOTO_TEMPLATES).map(([key, template]) => {
            const isSelected = selectedTemplate === key;
            const Icon = TEMPLATE_ICONS[template.hotoType] || BlankIcon;
            return (
              <Grid key={key} size={{ xs: 12, sm: 6 }}>
                <ButtonBase
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedTemplate(key)}
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    textAlign: 'left',
                    p: 2,
                    border: 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 1.5,
                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                    boxShadow: isSelected ? `0 0 0 1px ${theme.palette.primary.main}` : 'none',
                    '&:hover': { borderColor: isSelected ? 'primary.main' : 'text.disabled' },
                    '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {template.name}
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                        {template.fields.length
                          ? `${template.fields.length} fields${template.hotoType ? ` · ${getHotoTypeLabel(template.hotoType)} HOTO` : ''}`
                          : 'No fields'}
                      </Typography>
                    </Box>
                    {isSelected && <CheckIcon color="primary" fontSize="small" />}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.25 }}>
                    {template.description}
                  </Typography>
                  {template.fields.length > 0 && (
                    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 1 }}>
                      {template.fields.slice(0, 4).map((field) => field.key).join(' · ')}
                      {template.fields.length > 4 && ` · +${template.fields.length - 4} more`}
                    </Typography>
                  )}
                </ButtonBase>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, flexWrap: 'wrap', rowGap: 1.5 }}>
        {selected && (existingFieldCount > 0 || changesType) && (
          <Alert severity="warning" sx={{ flex: '1 1 100%', m: '0 !important' }}>
            {existingFieldCount > 0 &&
              `Applying "${selected.name}" replaces the ${existingFieldCount} ${existingFieldCount === 1 ? 'field' : 'fields'} already in this form, including their media.`}
            {existingFieldCount > 0 && changesType && ' '}
            {changesType &&
              `The HOTO type will change from ${getHotoTypeLabel(currentHotoType)} to ${getHotoTypeLabel(selected.hotoType)}.`}
          </Alert>
        )}
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleApplyTemplate}
          variant="contained"
          color={existingFieldCount > 0 ? 'warning' : 'primary'}
          disabled={!selected}
        >
          {existingFieldCount > 0 ? 'Replace fields' : 'Apply template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateSelector;
