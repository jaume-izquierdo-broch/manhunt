import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { useLocationAccessStore } from './location-access.store';

const permission = jest.mocked(Location.getForegroundPermissionsAsync);
const request = jest.mocked(Location.requestForegroundPermissionsAsync);
const servicesOn = jest.mocked(Location.hasServicesEnabledAsync);

const answer = (value: object) => value as never;
const access = () => useLocationAccessStore.getState().access;
const { refresh, fix } = useLocationAccessStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  servicesOn.mockResolvedValue(true);
  useLocationAccessStore.setState({ access: null });
});

describe('location access', () => {
  it('reads every situation', async () => {
    const cases: [object, boolean, string][] = [
      [{ status: 'undetermined', canAskAgain: true }, true, 'askable'],
      [{ status: 'denied', canAskAgain: true }, true, 'askable'],
      [{ status: 'denied', canAskAgain: false }, true, 'blocked'],
      [{ status: 'granted', canAskAgain: true }, false, 'servicesOff'],
      [
        { status: 'granted', canAskAgain: true, ios: { accuracy: 'reduced' } },
        true,
        'approximate',
      ],
      [{ status: 'granted', canAskAgain: true }, true, 'granted'],
    ];
    for (const [response, services, expected] of cases) {
      permission.mockResolvedValue(answer(response));
      servicesOn.mockResolvedValue(services);
      await refresh();
      expect(access()).toBe(expected);
    }
  });

  it('shows the system dialog while it can still be shown', async () => {
    useLocationAccessStore.setState({ access: 'askable' });
    request.mockResolvedValueOnce(answer({ status: 'granted' }));

    await fix();

    expect(request).toHaveBeenCalled();
    expect(access()).toBe('granted');
  });

  it('a refusal the OS will not ask again becomes "blocked"', async () => {
    useLocationAccessStore.setState({ access: 'askable' });
    request.mockResolvedValueOnce(
      answer({ status: 'denied', canAskAgain: false }),
    );

    await fix();

    expect(access()).toBe('blocked');
  });

  it('once blocked, opens the settings instead of asking', async () => {
    useLocationAccessStore.setState({ access: 'blocked' });
    await fix();
    expect(request).not.toHaveBeenCalled();
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('turns the location on (Android) when it is off', async () => {
    const os = Platform.OS;
    Platform.OS = 'android';
    useLocationAccessStore.setState({ access: 'servicesOff' });

    await fix();

    expect(Location.enableNetworkProviderAsync).toHaveBeenCalled();
    expect(access()).toBe('granted'); // read again afterwards
    Platform.OS = os;
  });
});
