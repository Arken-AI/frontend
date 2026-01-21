/**
 * Mock Simulation Data
 *
 * Sample API response for IPA-Water Extractive Distillation (Improved).
 * Used until real API integration in Phase 3.
 */

// Equipment type to icon mapping
export const EQUIPMENT_ICONS = {
  heater: "🔥",
  cooler: "❄️",
  pump: "💧",
  mixer: "🔀",
  splitter: "🔱",
  separator: "⚗️",
  flash_drum: "💨",
  distillation_column: "🏭",
  heat_exchanger: "🔄",
  reactor: "⚛️",
  compressor: "🌀",
  valve: "🚰",
  tank: "🛢️",
  default: "📦",
};

// Raw API response - IPA-Water Extractive Distillation (Improved)
export const mockApiResponse = {
  status: "success",
  flowsheet_id: "IPA-RECOVERY-003",
  property_package: "NRTL",
  input: {
    name: "IPA-Water Extractive Distillation (Improved)",
    compounds: ["isopropanol", "water", "dmso"],
    property_package: "NRTL",
    feed_streams: [
      {
        stream_id: "crude_ipa_feed",
        target_equipment: "feed_heater",
        target_port: "inlet",
        flow_rate: 5000.0,
        flow_basis: "mass",
        temperature_K: 298.15,
        pressure_Pa: 150000.0,
        composition: {
          isopropanol: 0.85,
          water: 0.15,
          dmso: 0.0,
        },
        composition_basis: "mass",
      },
      {
        stream_id: "entrainer_feed",
        target_equipment: "extractive_column",
        target_port: "feed_2",
        flow_rate: 4000.0,
        flow_basis: "mass",
        temperature_K: 350.0,
        pressure_Pa: 101325.0,
        composition: {
          isopropanol: 0.0,
          water: 0.0,
          dmso: 1.0,
        },
        composition_basis: "mass",
      },
    ],
    equipment: [
      {
        id: "feed_heater",
        type: "heater",
        name: "Feed Pre-Heater",
        parameters: {
          outlet_temperature_K: 355.0,
          pressure_drop_Pa: 10000,
          efficiency: 0.9,
        },
      },
      {
        id: "extractive_column",
        type: "distillation_column",
        name: "Extractive Distillation Column",
        parameters: {
          num_stages: 45,
          feed_stage: 25,
          feed_2_stage: 5,
          pressure_top_Pa: 101325,
          pressure_drop_per_stage_Pa: 300,
          condenser_type: "total",
          reboiler_type: "kettle",
          specification_mode: "reflux_ratio",
          reflux_ratio: 6.0,
          light_key: "isopropanol",
          heavy_key: "water",
          method: "rigorous",
          max_iterations: 300,
          tolerance: 1e-5,
          damping_factor: 0.3,
        },
      },
      {
        id: "ipa_cooler",
        type: "cooler",
        name: "IPA Product Cooler",
        parameters: {
          outlet_temperature_K: 303.15,
          pressure_drop_Pa: 5000,
        },
      },
      {
        id: "ipa_tank",
        type: "tank",
        name: "IPA Product Tank",
        parameters: {
          residence_time_min: 30,
          tank_type: "product",
        },
      },
      {
        id: "recovery_column",
        type: "distillation_column",
        name: "Entrainer Recovery Column",
        parameters: {
          num_stages: 15,
          feed_stage: 8,
          pressure_top_Pa: 20000,
          pressure_drop_per_stage_Pa: 200,
          condenser_type: "total",
          reboiler_type: "kettle",
          specification_mode: "reflux_ratio",
          reflux_ratio: 2.0,
          light_key: "water",
          heavy_key: "dmso",
          method: "shortcut",
          max_iterations: 100,
          tolerance: 0.0001,
        },
      },
      {
        id: "water_cooler",
        type: "cooler",
        name: "Wastewater Cooler",
        parameters: {
          outlet_temperature_K: 313.15,
          pressure_drop_Pa: 5000,
        },
      },
      {
        id: "entrainer_cooler",
        type: "cooler",
        name: "Recovered Entrainer Cooler",
        parameters: {
          outlet_temperature_K: 350.0,
          pressure_drop_Pa: 5000,
        },
      },
    ],
    edges: [
      {
        id: "heated_feed",
        source: "feed_heater",
        source_port: "outlet",
        target: "extractive_column",
        target_port: "feed",
        is_recycle: false,
      },
      {
        id: "ipa_distillate",
        source: "extractive_column",
        source_port: "distillate",
        target: "ipa_cooler",
        target_port: "inlet",
        is_recycle: false,
      },
      {
        id: "cooled_ipa",
        source: "ipa_cooler",
        source_port: "outlet",
        target: "ipa_tank",
        target_port: "inlet",
        is_recycle: false,
      },
      {
        id: "water_entrainer_bottoms",
        source: "extractive_column",
        source_port: "bottoms",
        target: "recovery_column",
        target_port: "feed",
        is_recycle: false,
      },
      {
        id: "recovered_water",
        source: "recovery_column",
        source_port: "distillate",
        target: "water_cooler",
        target_port: "inlet",
        is_recycle: false,
      },
      {
        id: "recovered_entrainer",
        source: "recovery_column",
        source_port: "bottoms",
        target: "entrainer_cooler",
        target_port: "inlet",
        is_recycle: false,
      },
    ],
  },
  result: {
    converged: true,
    iterations: 1,
    max_residual: 0.0,
    execution_order: [
      "FEED",
      "feed_heater",
      "extractive_column",
      "ipa_cooler",
      "recovery_column",
      "ipa_tank",
      "water_cooler",
      "entrainer_cooler",
      "PRODUCT",
    ],
    tear_streams: [],
    node_results: {
      feed_heater: {
        outlets: {
          outlet: {
            stream_id: "feed_heater_outlet",
            name: "Feed Pre-Heater Outlet",
            flow_rate: 5000.0,
            flow_basis: "mass",
            temperature_K: 355.0,
            pressure_Pa: 140000.0,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.85,
              water: 0.15,
              dmso: 0.0,
            },
            composition_basis: "mass",
            density_kg_m3: 731.11,
            molecular_weight: 44.5,
          },
        },
        energy_streams: {},
        warnings: [],
        converged: true,
        iterations: 0,
        metadata: {
          calculation_mode: "temperature_specified",
          inlet_temperature_K: 298.15,
          outlet_temperature_K: 355.0,
          temperature_change_K: 56.85,
          inlet_pressure_Pa: 150000.0,
          outlet_pressure_Pa: 140000.0,
          pressure_drop_Pa: 10000,
          inlet_phase: "liquid",
          outlet_phase: "liquid",
          outlet_vapor_fraction: 0.0,
          phase_description: "Subcooled liquid - 100% liquid phase",
          phase_change_detected: false,
          duty: {
            total_duty_kW: 289.77,
            sensible_heat_kW: 289.77,
            latent_heat_kW: 0.0,
            duty_supplied_kW: 321.967,
          },
          efficiency: 0.9,
          bubble_point_K: 363.11,
          dew_point_K: 362.9,
        },
        status: "active",
      },
      extractive_column: {
        outlets: {
          distillate: {
            stream_id: "extractive_column_distillate",
            name: "Distillate",
            flow_rate: 3945.43,
            flow_basis: "mass",
            temperature_K: 355.14,
            pressure_Pa: 101325,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.8112,
              water: 0.1888,
              dmso: 0.0000002,
            },
            composition_basis: "molar",
          },
          bottoms: {
            stream_id: "extractive_column_bottoms",
            name: "Bottoms",
            flow_rate: 5054.57,
            flow_basis: "mass",
            temperature_K: 400.15,
            pressure_Pa: 114525,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.2076,
              water: 0.001,
              dmso: 0.7914,
            },
            composition_basis: "molar",
          },
        },
        energy_streams: {
          condenser_duty: {
            stream_id: "extractive_column_condenser",
            name: "Condenser Duty",
            energy_type: "cooling",
            duty_W: -1178130943.43,
            duty_kW: -1178130.94,
            duty_MW: -1178.13,
          },
          reboiler_duty: {
            stream_id: "extractive_column_reboiler",
            name: "Reboiler Duty",
            energy_type: "heat",
            duty_W: 1237037490.6,
            duty_kW: 1237037.49,
            duty_MW: 1237.04,
          },
        },
        warnings: [
          "Multi-feed column: Main feed 5000.00 mol/s, Second feed 4000.00 mol/s",
          "TERNARY AZEOTROPIC SYSTEM: 3-component system with isopropanol-water azeotrope (minimum). Using rigorous MESH solver with NRTL activity coefficients.",
          "Product split corrected for component balance: D changed from 4207.50 to 3945.43 mol/s",
        ],
        converged: true,
        iterations: 80,
        metadata: {
          num_stages: 45,
          feed_stage: 25,
          method: "rigorous",
          condenser_type: "total",
          reboiler_type: "kettle",
          light_key: "isopropanol",
          heavy_key: "water",
          reflux_ratio: 6.0,
          boilup_ratio: 5.827,
          condenser_duty_kW: 1178130.94,
          reboiler_duty_kW: 1237037.49,
          distillate_rate: 3945.43,
          bottoms_rate: 5054.57,
          top_temperature_K: 355.14,
          bottom_temperature_K: 400.15,
          separation_achieved: {
            light_key_in_distillate: 0.8112,
            heavy_key_in_bottoms: 0.001,
            light_key_recovery: 0.7531,
          },
        },
        status: "active",
      },
      ipa_cooler: {
        outlets: {
          outlet: {
            stream_id: "ipa_cooler_outlet",
            name: "IPA Product Cooler Outlet",
            flow_rate: 3945.43,
            flow_basis: "mass",
            temperature_K: 303.15,
            pressure_Pa: 96325,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.8112,
              water: 0.1888,
              dmso: 0.0000002,
            },
            composition_basis: "molar",
            density_kg_m3: 784.33,
          },
        },
        energy_streams: {},
        warnings: [],
        converged: true,
        iterations: 0,
        metadata: {
          calculation_mode: "temperature_specified",
          inlet_temperature_K: 355.14,
          outlet_temperature_K: 303.15,
          temperature_change_K: -51.99,
          inlet_pressure_Pa: 101325,
          outlet_pressure_Pa: 96325,
          pressure_drop_Pa: 5000,
          inlet_phase: "liquid",
          outlet_phase: "liquid",
          outlet_vapor_fraction: 0.0,
          phase_description: "Subcooled liquid - 100% liquid phase",
          duty: {
            total_duty_kW: -195.5,
            duty_removed_kW: 195.5,
          },
          efficiency: 1.0,
        },
        status: "active",
      },
      ipa_tank: {
        outlets: {
          outlet: {
            stream_id: "ipa_tank_outlet",
            name: "IPA Product Tank Outlet",
            flow_rate: 3945.43,
            flow_basis: "mass",
            temperature_K: 303.15,
            pressure_Pa: 96325,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.8112,
              water: 0.1888,
              dmso: 0.0000002,
            },
            composition_basis: "molar",
          },
        },
        energy_streams: {},
        warnings: [],
        converged: true,
        iterations: 0,
        metadata: {
          tank_type: "product",
          residence_time_min: 30,
          volume_m3: 1.97,
        },
        status: "active",
      },
      recovery_column: {
        outlets: {
          distillate: {
            stream_id: "recovery_column_distillate",
            name: "Recovered Water",
            flow_rate: 750.5,
            flow_basis: "mass",
            temperature_K: 333.15,
            pressure_Pa: 20000,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.15,
              water: 0.84,
              dmso: 0.01,
            },
            composition_basis: "molar",
          },
          bottoms: {
            stream_id: "recovery_column_bottoms",
            name: "Recovered DMSO",
            flow_rate: 4304.07,
            flow_basis: "mass",
            temperature_K: 450.0,
            pressure_Pa: 22800,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.01,
              water: 0.001,
              dmso: 0.989,
            },
            composition_basis: "molar",
          },
        },
        energy_streams: {
          condenser_duty: {
            stream_id: "recovery_column_condenser",
            name: "Condenser Duty",
            energy_type: "cooling",
            duty_kW: -85000.0,
          },
          reboiler_duty: {
            stream_id: "recovery_column_reboiler",
            name: "Reboiler Duty",
            energy_type: "heat",
            duty_kW: 92000.0,
          },
        },
        warnings: ["Using shortcut method (Fenske-Underwood-Gilliland)"],
        converged: true,
        iterations: 15,
        metadata: {
          num_stages: 15,
          feed_stage: 8,
          method: "shortcut",
          condenser_type: "total",
          reboiler_type: "kettle",
          light_key: "water",
          heavy_key: "dmso",
          reflux_ratio: 2.0,
          condenser_duty_kW: 85000.0,
          reboiler_duty_kW: 92000.0,
          top_temperature_K: 333.15,
          bottom_temperature_K: 450.0,
        },
        status: "active",
      },
      water_cooler: {
        outlets: {
          outlet: {
            stream_id: "water_cooler_outlet",
            name: "Wastewater Cooler Outlet",
            flow_rate: 750.5,
            flow_basis: "mass",
            temperature_K: 313.15,
            pressure_Pa: 15000,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.15,
              water: 0.84,
              dmso: 0.01,
            },
            composition_basis: "molar",
            density_kg_m3: 992.5,
          },
        },
        energy_streams: {},
        warnings: [],
        converged: true,
        iterations: 0,
        metadata: {
          calculation_mode: "temperature_specified",
          inlet_temperature_K: 333.15,
          outlet_temperature_K: 313.15,
          temperature_change_K: -20.0,
          inlet_pressure_Pa: 20000,
          outlet_pressure_Pa: 15000,
          pressure_drop_Pa: 5000,
          duty: {
            total_duty_kW: -12.5,
            duty_removed_kW: 12.5,
          },
        },
        status: "active",
      },
      entrainer_cooler: {
        outlets: {
          outlet: {
            stream_id: "entrainer_cooler_outlet",
            name: "Recovered Entrainer Cooler Outlet",
            flow_rate: 4304.07,
            flow_basis: "mass",
            temperature_K: 350.0,
            pressure_Pa: 17800,
            phase: "liquid",
            vapor_fraction: 0.0,
            composition: {
              isopropanol: 0.01,
              water: 0.001,
              dmso: 0.989,
            },
            composition_basis: "molar",
            density_kg_m3: 1050.2,
          },
        },
        energy_streams: {},
        warnings: [],
        converged: true,
        iterations: 0,
        metadata: {
          calculation_mode: "temperature_specified",
          inlet_temperature_K: 450.0,
          outlet_temperature_K: 350.0,
          temperature_change_K: -100.0,
          inlet_pressure_Pa: 22800,
          outlet_pressure_Pa: 17800,
          pressure_drop_Pa: 5000,
          duty: {
            total_duty_kW: -75.8,
            duty_removed_kW: 75.8,
          },
        },
        status: "active",
      },
    },
    equipment_inputs: {
      feed_heater: {
        equipment_type: "heater",
        applied_parameters: {
          outlet_temperature_K: 355.0,
          duty_kW: null,
          pressure_drop_Pa: 10000,
          efficiency: 0.9,
        },
        parameter_constraints: {
          outlet_temperature_K: {
            min: 250.0,
            max: 500.0,
            unit: "K",
            description: "Target outlet temperature",
          },
          duty_kW: {
            min: 0.0,
            max: 10000.0,
            unit: "kW",
            description: "Heat duty (alternative to temperature)",
          },
          pressure_drop_Pa: {
            min: 0.0,
            max: 100000.0,
            unit: "Pa",
            description: "Pressure drop through heater",
          },
          efficiency: {
            min: 0.5,
            max: 1.0,
            unit: "fraction",
            description: "Thermal efficiency (heat transfer)",
          },
        },
        inlet_ports: ["crude_ipa_feed"],
        outlet_ports: ["heated_feed"],
      },
      extractive_column: {
        equipment_type: "distillation_column",
        applied_parameters: {
          num_stages: 45,
          feed_stage: 25,
          feed_2_stage: 5,
          pressure_top_Pa: 101325,
          pressure_drop_per_stage_Pa: 300,
          reflux_ratio: 6.0,
          condenser_type: "total",
          reboiler_type: "kettle",
          damping_factor: 0.3,
        },
        parameter_constraints: {
          num_stages: {
            min: 10,
            max: 100,
            unit: "stages",
            description: "Number of theoretical stages",
          },
          feed_stage: {
            min: 2,
            max: 99,
            unit: "stage",
            description: "Main feed stage location (from top)",
          },
          feed_2_stage: {
            min: 2,
            max: 99,
            unit: "stage",
            description: "Entrainer feed stage location (from top)",
          },
          pressure_top_Pa: {
            min: 10000,
            max: 500000,
            unit: "Pa",
            description: "Column top pressure",
          },
          pressure_drop_per_stage_Pa: {
            min: 0,
            max: 2000,
            unit: "Pa/stage",
            description: "Pressure drop per tray",
          },
          reflux_ratio: {
            min: 0.5,
            max: 20.0,
            unit: "ratio",
            description: "Reflux ratio (L/D)",
          },
          damping_factor: {
            min: 0.1,
            max: 1.0,
            unit: "fraction",
            description: "Convergence damping factor",
          },
        },
        inlet_ports: ["heated_feed", "entrainer_feed"],
        outlet_ports: ["ipa_distillate", "water_entrainer_bottoms"],
      },
      ipa_cooler: {
        equipment_type: "cooler",
        applied_parameters: {
          outlet_temperature_K: 303.15,
          duty_kW: null,
          pressure_drop_Pa: 5000,
          efficiency: 1.0,
        },
        parameter_constraints: {
          outlet_temperature_K: {
            min: 250.0,
            max: 400.0,
            unit: "K",
            description: "Target outlet temperature",
          },
          duty_kW: {
            min: 0.0,
            max: 10000.0,
            unit: "kW",
            description: "Heat removed (alternative to temperature)",
          },
          pressure_drop_Pa: {
            min: 0.0,
            max: 50000.0,
            unit: "Pa",
            description: "Pressure drop through cooler",
          },
          efficiency: {
            min: 0.5,
            max: 1.0,
            unit: "fraction",
            description: "Thermal efficiency",
          },
        },
        inlet_ports: ["ipa_distillate"],
        outlet_ports: ["cooled_ipa"],
      },
      ipa_tank: {
        equipment_type: "tank",
        applied_parameters: {
          residence_time_min: 30,
          tank_type: "product",
        },
        parameter_constraints: {
          residence_time_min: {
            min: 5,
            max: 120,
            unit: "min",
            description: "Liquid residence time in tank",
          },
        },
        inlet_ports: ["cooled_ipa"],
        outlet_ports: [],
      },
      recovery_column: {
        equipment_type: "distillation_column",
        applied_parameters: {
          num_stages: 15,
          feed_stage: 8,
          pressure_top_Pa: 20000,
          pressure_drop_per_stage_Pa: 200,
          reflux_ratio: 2.0,
          condenser_type: "total",
          reboiler_type: "kettle",
        },
        parameter_constraints: {
          num_stages: {
            min: 5,
            max: 50,
            unit: "stages",
            description: "Number of theoretical stages",
          },
          feed_stage: {
            min: 2,
            max: 49,
            unit: "stage",
            description: "Feed stage location (from top)",
          },
          pressure_top_Pa: {
            min: 5000,
            max: 200000,
            unit: "Pa",
            description: "Column top pressure (vacuum for DMSO recovery)",
          },
          pressure_drop_per_stage_Pa: {
            min: 0,
            max: 1000,
            unit: "Pa/stage",
            description: "Pressure drop per tray",
          },
          reflux_ratio: {
            min: 0.5,
            max: 10.0,
            unit: "ratio",
            description: "Reflux ratio (L/D)",
          },
        },
        inlet_ports: ["water_entrainer_bottoms"],
        outlet_ports: ["recovered_water", "recovered_entrainer"],
      },
      water_cooler: {
        equipment_type: "cooler",
        applied_parameters: {
          outlet_temperature_K: 313.15,
          duty_kW: null,
          pressure_drop_Pa: 5000,
          efficiency: 1.0,
        },
        parameter_constraints: {
          outlet_temperature_K: {
            min: 280.0,
            max: 350.0,
            unit: "K",
            description: "Target outlet temperature",
          },
          duty_kW: {
            min: 0.0,
            max: 1000.0,
            unit: "kW",
            description: "Heat removed",
          },
          pressure_drop_Pa: {
            min: 0.0,
            max: 20000.0,
            unit: "Pa",
            description: "Pressure drop through cooler",
          },
          efficiency: {
            min: 0.5,
            max: 1.0,
            unit: "fraction",
            description: "Thermal efficiency",
          },
        },
        inlet_ports: ["recovered_water"],
        outlet_ports: [],
      },
      entrainer_cooler: {
        equipment_type: "cooler",
        applied_parameters: {
          outlet_temperature_K: 350.0,
          duty_kW: null,
          pressure_drop_Pa: 5000,
          efficiency: 1.0,
        },
        parameter_constraints: {
          outlet_temperature_K: {
            min: 300.0,
            max: 420.0,
            unit: "K",
            description: "Target outlet temperature (for entrainer recycle)",
          },
          duty_kW: {
            min: 0.0,
            max: 5000.0,
            unit: "kW",
            description: "Heat removed",
          },
          pressure_drop_Pa: {
            min: 0.0,
            max: 30000.0,
            unit: "Pa",
            description: "Pressure drop through cooler",
          },
          efficiency: {
            min: 0.5,
            max: 1.0,
            unit: "fraction",
            description: "Thermal efficiency",
          },
        },
        inlet_ports: ["recovered_entrainer"],
        outlet_ports: [],
      },
    },
    stream_results: {
      crude_ipa_feed: {
        flow_rate: 5000.0,
        flow_basis: "mass",
        temperature_K: 298.15,
        pressure_Pa: 150000.0,
        phase: "liquid",
        composition: {
          isopropanol: 0.85,
          water: 0.15,
          dmso: 0.0,
        },
        composition_basis: "mass",
      },
      entrainer_feed: {
        flow_rate: 4000.0,
        flow_basis: "mass",
        temperature_K: 350.0,
        pressure_Pa: 101325.0,
        phase: "liquid",
        composition: {
          isopropanol: 0.0,
          water: 0.0,
          dmso: 1.0,
        },
        composition_basis: "mass",
      },
      heated_feed: {
        flow_rate: 5000.0,
        flow_basis: "mass",
        temperature_K: 355.0,
        pressure_Pa: 140000.0,
        phase: "liquid",
        composition: {
          isopropanol: 0.85,
          water: 0.15,
          dmso: 0.0,
        },
        composition_basis: "mass",
      },
      ipa_distillate: {
        flow_rate: 3945.43,
        flow_basis: "mass",
        temperature_K: 355.14,
        pressure_Pa: 101325,
        phase: "liquid",
        composition: {
          isopropanol: 0.8112,
          water: 0.1888,
          dmso: 0.0000002,
        },
        composition_basis: "molar",
      },
      cooled_ipa: {
        flow_rate: 3945.43,
        flow_basis: "mass",
        temperature_K: 303.15,
        pressure_Pa: 96325,
        phase: "liquid",
        composition: {
          isopropanol: 0.8112,
          water: 0.1888,
          dmso: 0.0000002,
        },
        composition_basis: "molar",
      },
      water_entrainer_bottoms: {
        flow_rate: 5054.57,
        flow_basis: "mass",
        temperature_K: 400.15,
        pressure_Pa: 114525,
        phase: "liquid",
        composition: {
          isopropanol: 0.2076,
          water: 0.001,
          dmso: 0.7914,
        },
        composition_basis: "molar",
      },
      recovered_water: {
        flow_rate: 750.5,
        flow_basis: "mass",
        temperature_K: 333.15,
        pressure_Pa: 20000,
        phase: "liquid",
        composition: {
          isopropanol: 0.15,
          water: 0.84,
          dmso: 0.01,
        },
        composition_basis: "molar",
      },
      recovered_entrainer: {
        flow_rate: 4304.07,
        flow_basis: "mass",
        temperature_K: 450.0,
        pressure_Pa: 22800,
        phase: "liquid",
        composition: {
          isopropanol: 0.01,
          water: 0.001,
          dmso: 0.989,
        },
        composition_basis: "molar",
      },
    },
    warnings: [
      "Multi-feed column: Main feed 5000.00 mol/s, Second feed 4000.00 mol/s",
      "TERNARY AZEOTROPIC SYSTEM: 3-component system with isopropanol-water azeotrope",
      "Using shortcut method for recovery column (Fenske-Underwood-Gilliland)",
    ],
    errors: [],
    execution_time_s: 45.2,
  },
};

/**
 * Transform API response to UI-friendly format
 * Includes global stream numbering for easy reference
 */
export function transformEquipmentData(apiResponse) {
  const { result, input } = apiResponse;

  // Get feed stream IDs for editability check
  const feedStreamIds = input.feed_streams.map((f) => f.stream_id);

  // STEP 1: Build stream numbering map
  // Track all unique streams in order of appearance
  const streamNumberMap = new Map();
  let streamCounter = 1;

  result.execution_order
    .filter((id) => id !== "FEED" && id !== "PRODUCT")
    .forEach((equipmentId) => {
      const nodeResult = result.node_results[equipmentId];
      const equipmentInput = result.equipment_inputs[equipmentId];

      if (!nodeResult || !equipmentInput) return;

      // Number input streams (if not already numbered)
      equipmentInput.inlet_ports.forEach((streamId) => {
        if (!streamNumberMap.has(streamId)) {
          streamNumberMap.set(streamId, streamCounter++);
        }
      });

      // Number output streams
      Object.values(nodeResult.outlets).forEach((stream) => {
        const streamId = stream.stream_id;
        if (!streamNumberMap.has(streamId)) {
          streamNumberMap.set(streamId, streamCounter++);
        }
      });
    });

  // STEP 2: Transform equipment with stream numbers
  return result.execution_order
    .filter((id) => id !== "FEED" && id !== "PRODUCT") // Skip pseudo-nodes
    .map((equipmentId) => {
      const nodeResult = result.node_results[equipmentId];
      const equipmentInput = result.equipment_inputs[equipmentId];
      const equipmentDef = input.equipment.find((e) => e.id === equipmentId);

      if (!nodeResult || !equipmentInput) return null;

      // Build constraints array
      const constraints = Object.entries(equipmentInput.applied_parameters)
        .filter(([_, value]) => value !== null) // Skip null values
        .map(([key, value]) => ({
          key,
          value,
          ...(equipmentInput.parameter_constraints[key] || {}),
        }));

      // Build inputs array with stream numbers
      const inputs = equipmentInput.inlet_ports.map((streamId) => {
        const streamData = result.stream_results[streamId] || {};
        const feedStream = input.feed_streams.find(
          (f) => f.stream_id === streamId
        );
        return {
          streamId,
          streamNumber: streamNumberMap.get(streamId),
          name: feedStream?.stream_id || streamId,
          ...streamData,
          ...(feedStream || {}),
          editable: feedStreamIds.includes(streamId),
        };
      });

      // Build outputs array with stream numbers
      const outputs = Object.entries(nodeResult.outlets).map(
        ([port, stream]) => ({
          port,
          streamNumber: streamNumberMap.get(stream.stream_id),
          ...stream,
          editable: false,
        })
      );

      return {
        id: equipmentId,
        name: equipmentDef?.name || equipmentId,
        type: equipmentInput.equipment_type,
        icon:
          EQUIPMENT_ICONS[equipmentInput.equipment_type] ||
          EQUIPMENT_ICONS.default,
        converged: nodeResult.converged,
        iterations: nodeResult.iterations,
        warnings: nodeResult.warnings || [],
        metadata: nodeResult.metadata || {},
        constraints,
        inputs,
        outputs,
        energyStreams: nodeResult.energy_streams || {},
      };
    })
    .filter(Boolean); // Remove null entries
}

// Export transformed data for direct use
export const mockEquipmentData = transformEquipmentData(mockApiResponse);
