export interface LocationService {
  startPeriodicReporting: (enabled: boolean) => Promise<void>;
  stopPeriodicReporting: () => void;
}

const locationService: LocationService = {
  startPeriodicReporting: async () => { },
  stopPeriodicReporting: () => { },
};

export default locationService;
