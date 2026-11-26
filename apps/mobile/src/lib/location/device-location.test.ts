import * as Location from 'expo-location';
import { getCurrentPosition, watchPosition } from './device-location';

describe('device location', () => {
  beforeEach(() => jest.clearAllMocks());

  // If Android's "Location Accuracy" dialog is refused, expo-location never
  // delivers a position. GPS alone is enough, so the dialog is never shown.
  it('never depends on the Location Accuracy dialog', async () => {
    await watchPosition(jest.fn());
    await getCurrentPosition();

    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mayShowUserSettingsDialog: false }),
      expect.any(Function),
    );
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mayShowUserSettingsDialog: false }),
    );
  });
});
