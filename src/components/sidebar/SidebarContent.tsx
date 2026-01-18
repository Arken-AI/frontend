import { useUIStore } from '../../stores/uiStore';

export function EquipmentSection() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        Equipment tree will be displayed here
      </p>
    </div>
  );
}

export function DetailsSection() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        Equipment details and parameters will be displayed here
      </p>
    </div>
  );
}

export function ThermoSection() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        Thermodynamic properties will be displayed here
      </p>
    </div>
  );
}

export function WarningsSection() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        Simulation warnings and errors will be displayed here
      </p>
    </div>
  );
}

export function HistorySection() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">
        Run history will be displayed here
      </p>
    </div>
  );
}

export function SidebarContent() {
  const activeSection = useUIStore((state) => state.activeSection);

  switch (activeSection) {
    case 'equipment':
      return <EquipmentSection />;
    case 'details':
      return <DetailsSection />;
    case 'thermo':
      return <ThermoSection />;
    case 'warnings':
      return <WarningsSection />;
    case 'history':
      return <HistorySection />;
    default:
      return null;
  }
}
