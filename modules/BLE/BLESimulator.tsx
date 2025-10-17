// BLE Simulator for testing BLE functionality without real hardware
import React, { createContext, useContext, useState, useEffect } from 'react';

interface BLESimulatorContextType {
  isSimulating: boolean;
  startSimulation: () => void;
  stopSimulation: () => void;
  simulateBeaconDetection: (sessionToken: string) => void;
  simulateSessionBroadcast: (sessionToken: string) => void;
}

const BLESimulatorContext = createContext<BLESimulatorContextType | null>(null);

export const BLESimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSimulating, setIsSimulating] = useState(false);

  const startSimulation = () => {
    console.log('🔵 BLE Simulator: Starting simulation mode');
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    console.log('🔴 BLE Simulator: Stopping simulation mode');
    setIsSimulating(false);
  };

  const simulateBeaconDetection = (sessionToken: string) => {
    console.log('📡 BLE Simulator: Simulating beacon detection for session:', sessionToken);
    // Simulate auto-check-in after 2 seconds
    setTimeout(() => {
      console.log('✅ BLE Simulator: Auto-check-in successful');
      // You could trigger actual check-in logic here
    }, 2000);
  };

  const simulateSessionBroadcast = (sessionToken: string) => {
    console.log('📢 BLE Simulator: Simulating session broadcast:', sessionToken);
    // Simulate broadcasting
  };

  return (
    <BLESimulatorContext.Provider value={{
      isSimulating,
      startSimulation,
      stopSimulation,
      simulateBeaconDetection,
      simulateSessionBroadcast
    }}>
      {children}
    </BLESimulatorContext.Provider>
  );
};

export const useBLESimulator = () => {
  const context = useContext(BLESimulatorContext);
  if (!context) {
    throw new Error('useBLESimulator must be used within BLESimulatorProvider');
  }
  return context;
};

// Simulator UI Component
export const BLESimulatorControls: React.FC = () => {
  const { isSimulating, startSimulation, stopSimulation, simulateBeaconDetection } = useBLESimulator();

  if (!__DEV__) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: 10, 
      borderRadius: 8,
      zIndex: 9999 
    }}>
      <h4>🔧 BLE Simulator</h4>
      <button onClick={isSimulating ? stopSimulation : startSimulation}>
        {isSimulating ? 'Stop' : 'Start'} Simulation
      </button>
      {isSimulating && (
        <div>
          <button onClick={() => simulateBeaconDetection('test-session-123')}>
            Simulate Beacon Detection
          </button>
        </div>
      )}
    </div>
  );
};