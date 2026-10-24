import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Link,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import blockProfileService from "../../services/blockProfileService.jsx";
import { useBlockPermissions } from "../../hooks/useBlockPermissions";
import PageHeader from "../common/PageHeader";
import SectionCard from "../common/SectionCard";
import StatTile from "../common/StatTile";
import StatusPill from "../common/StatusPill";
import DetailRow from "../common/DetailRow";
import ConfirmDeleteDialog from "../common/ConfirmDeleteDialog";
import BlockSectionsPanel from "./BlockSectionsPanel";
import BlockMapPanel from "./BlockMapPanel";
import { BlockInfraPanel, GpInfraPanel } from "./InfraPanels";
import BlockDiagramsPanel from "./diagrams/BlockDiagramsPanel";
import { DemoChip, ResetDemoDialog } from "./DemoBlock";
import { useIsAdmin } from "../../hooks/useIsAdmin";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { SITE_TYPES, blockPlace, blockStatus, formatDate } from "./blockProfileConstants";

const TABS = ["overview", "block", "gps", "sections", "map", "diagrams"];

// Tab label with a ✓ once that part of the block is done
const TabLabel = ({ label, done }) => (
  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
    {label}
    {done && <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />}
  </Box>
);

const withCode = (name, code) => [name, code ? `LGD ${code}` : ""].filter(Boolean).join(" · ");

const googleMapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const Overview = ({ profile }) => {
  const declared = profile.numberOfGps;
  const entered = profile.gps?.length || 0;
  const status = blockStatus(profile.status);
  const router = profile.blockRouter || {};
  const hasRouterPoint = router.latitude != null && router.longitude != null;

  return (
    <>
      {profile.gpCountMismatch && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Declared {declared} GPs but {entered} {entered === 1 ? "is" : "are"} entered. The block stays flagged until the counts match.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Sections" value={profile.sectionCount} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Section length" value={Math.round(profile.sectionLength || 0)} suffix=" m" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label="GPs declared / entered"
            value={`${declared} / ${entered}`}
            caption={profile.gpCountMismatch ? "Mismatch flagged" : "Counts match"}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="KML files" value={profile.kmlFiles?.length || 0} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <SectionCard title="Profile">
            <DetailRow label="State">{withCode(profile.state, profile.stateCode)}</DetailRow>
            <DetailRow label="District">{withCode(profile.district, profile.districtCode)}</DetailRow>
            <DetailRow label="Block">{withCode(profile.block, profile.blockCode)}</DetailRow>
            <DetailRow label={`Rings (${profile.rings?.length || 0})`}>
              {profile.rings?.length ? (
                <Box component="span" sx={{ fontFamily: "monospace" }}>
                  {profile.rings.map((r) => r.code).join(", ")}
                </Box>
              ) : (
                ""
              )}
            </DetailRow>
            <DetailRow label="Status">
              <StatusPill label={status.label} tone={status.tone} />
            </DetailRow>
            <DetailRow label="Last updated">{formatDate(profile.updatedAt)}</DetailRow>
          </SectionCard>

          <SectionCard title="Block router" subtitle="The block's head node: sections start here">
            {hasRouterPoint || router.address || router.siteType ? (
              <>
                <DetailRow label="Site type">{SITE_TYPES[router.siteType]}</DetailRow>
                <DetailRow label="Coordinates">
                  {hasRouterPoint && (
                    <>
                      {router.latitude}, {router.longitude}
                      <Link
                        href={googleMapsUrl(router.latitude, router.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "block", fontWeight: 600 }}
                      >
                        Google Maps
                      </Link>
                    </>
                  )}
                </DetailRow>
                <DetailRow label="Address">{router.address}</DetailRow>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Not set yet.
              </Typography>
            )}
          </SectionCard>

          {profile.remarks && (
            <SectionCard title="Remarks">
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {profile.remarks}
              </Typography>
            </SectionCard>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <SectionCard
            title="Gram Panchayats"
            subtitle={`Declared ${declared} · Entered ${entered}`}
            action={profile.gpCountMismatch && <StatusPill label="Mismatch" tone="warning" />}
            contentSx={{ p: 0 }}
          >
            {entered === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", px: 2.5, py: 3, textAlign: "center" }}>
                No GPs entered yet.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48 }}>#</TableCell>
                    <TableCell>GP name</TableCell>
                    <TableCell>LGD code</TableCell>
                    <TableCell>Ring</TableCell>
                    <TableCell>Coordinates</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profile.gps.map((gp, index) => (
                    <TableRow key={gp.lgdCode}>
                      <TableCell sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{index + 1}</TableCell>
                      <TableCell>{gp.name}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{gp.lgdCode}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", color: gp.ringCode ? "text.primary" : "text.disabled" }}>{gp.ringCode || "—"}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {gp.latitude != null && gp.longitude != null ? (
                          <Link href={googleMapsUrl(gp.latitude, gp.longitude)} target="_blank" rel="noopener noreferrer">
                            {gp.latitude}, {gp.longitude}
                          </Link>
                        ) : (
                          <Box component="span" sx={{ color: "text.disabled" }}>
                            —
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
};

const BlockProfileDetailPage = () => {
  const navigate = useNavigate();
  const { blockProfileId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "overview";
  const { can, userId, loading: permissionsLoading, error: permissionsError } = useBlockPermissions();

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  // Deactivate confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [demoReset, setDemoReset] = useState(false);
  const isAdmin = useIsAdmin();
  const [deactivateError, setDeactivateError] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setError("");
      setProfile(await blockProfileService.get(blockProfileId));
    } catch (e) {
      setError(e.message || "Failed to load the block profile");
    }
  }, [blockProfileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleDeactivate = async () => {
    try {
      setDeactivating(true);
      setDeactivateError("");
      // The dialog has already warned about the block's sections, so confirming forces it
      const updated = await blockProfileService.deactivate(blockProfileId, {
        force: profile.sectionCount > 0,
        updatedBy: userId,
      });
      setProfile(updated);
      setConfirmOpen(false);
    } catch (e) {
      setDeactivateError(e.message || "Failed to deactivate the block profile");
      // Sections were added since the page loaded; show the new count before trying again
      if (e.status === 409) loadProfile();
    } finally {
      setDeactivating(false);
    }
  };

  const selectTab = (event, value) => setSearchParams(value === "overview" ? {} : { tab: value }, { replace: true });

  const canEdit = profile && can("editBlockProfile", profile);
  const canDeactivate = profile && profile.status !== "INACTIVE" && can("deleteBlockProfile");
  const status = profile && blockStatus(profile.status);
  const progress = profile?.progress || {};

  const header = (
    <PageHeader
      title={profile?.block || "Block profile"}
      subtitle={
        profile && (
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            {[blockPlace(profile), `LGD ${profile.blockCode}`].filter(Boolean).join(" · ")}
            <StatusPill label={status.label} tone={status.tone} />
            {profile.isDemo && <DemoChip />}
          </Box>
        )
      }
      actions={
        <>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/block-profiles")}>
            Back to list
          </Button>
          {canEdit && (
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/block-profiles/${blockProfileId}/edit`)}>
              Edit
            </Button>
          )}
          {canDeactivate && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<BlockOutlinedIcon />}
              onClick={() => {
                setDeactivateError("");
                setConfirmOpen(true);
              }}
            >
              Deactivate
            </Button>
          )}
        </>
      }
    />
  );

  if (!permissionsLoading && !can("viewBlockProfile")) {
    return (
      <Box>
        {header}
        <Alert severity={permissionsError ? "error" : "info"}>
          {permissionsError ? `Couldn't check your permissions: ${permissionsError}` : "Block profiles aren't available for your role."}
        </Alert>
      </Box>
    );
  }

  if (error && !profile) {
    return (
      <Box>
        {header}
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadProfile}>Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box>
        {header}
        <Skeleton variant="rounded" height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {profile.isDemo && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            isAdmin && (
              <Button color="inherit" size="small" onClick={() => setDemoReset(true)}>
                Reset demo block
              </Button>
            )
          }
        >
          Demo block with complete sample data, visible to admins only. Create, edit, approve and delete freely; Reset puts it back.
        </Alert>
      )}
      <ResetDemoDialog
        open={demoReset}
        exists
        onClose={() => setDemoReset(false)}
        onDone={(id) => {
          setDemoReset(false);
          navigate(`/block-profiles/${id}`, { replace: true });
        }}
      />

      {profile.status === "INACTIVE" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This block profile is inactive.{canEdit && " Edit it and set the status to Active to restore it."}
        </Alert>
      )}

      <Tabs value={tab} onChange={selectTab} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab value="overview" label="Overview" />
        <Tab value="block" label={<TabLabel label="Block infra" done={progress.infraDone} />} />
        <Tab
          value="gps"
          label={
            <TabLabel
              label={`GPs ${progress.gpsCaptured || 0}/${progress.gpsTotal || 0}`}
              done={progress.gpsTotal > 0 && progress.gpsCaptured === progress.gpsTotal}
            />
          }
        />
        <Tab
          value="sections"
          label={
            <TabLabel
              label={`Sections (${profile.sectionCount})`}
              done={progress.sectionsTotal > 0 && progress.sectionsRestored === progress.sectionsTotal}
            />
          }
        />
        <Tab value="map" label="Map" />
        <Tab value="diagrams" label="Diagrams" />
      </Tabs>

      {tab === "overview" && <Overview profile={profile} />}
      {tab === "block" && (
        <BlockInfraPanel blockProfile={profile} canCapture={can("captureInfra")} canEditEquipment={can("manageInfraEquipment")} />
      )}
      {tab === "gps" && (
        <GpInfraPanel blockProfile={profile} canCapture={can("captureInfra")} canEditEquipment={can("manageInfraEquipment")} />
      )}
      {tab === "sections" && <BlockSectionsPanel blockProfile={profile} canManage={can("createSection")} onChanged={loadProfile} />}
      {tab === "diagrams" && <BlockDiagramsPanel blockProfile={profile} />}
      {tab === "map" && (
        <BlockMapPanel blockProfile={profile} canManageKml={can("manageKml")} userId={userId} onProfileChange={setProfile} />
      )}

      <ConfirmDeleteDialog
        open={confirmOpen}
        title="Deactivate block profile?"
        error={deactivateError}
        deleting={deactivating}
        confirmLabel={profile.sectionCount > 0 ? "Deactivate anyway" : "Deactivate"}
        busyLabel="Deactivating…"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDeactivate}
      >
        "{profile.block}" will be hidden from the block list.
        {profile.sectionCount > 0 &&
          ` Its ${profile.sectionCount} ${profile.sectionCount === 1 ? "section stays" : "sections stay"} linked to it.`}{" "}
        You can restore it later by setting the status back to Active.
      </ConfirmDeleteDialog>
    </Box>
  );
};

export default BlockProfileDetailPage;
