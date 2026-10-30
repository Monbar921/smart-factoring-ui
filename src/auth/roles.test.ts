import { testToken } from '@/test/token';
import { rolesOf } from './roles';

describe('rolesOf', () => {
  it('reads realm roles from access token', () => {
    expect(rolesOf(testToken('operator', 'user'))).toEqual({ operator: true, manager: false, viewer: false });
    expect(rolesOf(testToken('operator', 'manager'))).toEqual({ operator: true, manager: true, viewer: false });
  });

  it('treats missing or broken token as no roles', () => {
    expect(rolesOf(undefined)).toEqual({ operator: false, manager: false, viewer: false });
    expect(rolesOf('not-a-jwt')).toEqual({ operator: false, manager: false, viewer: false });
    expect(rolesOf('a.%%%.c')).toEqual({ operator: false, manager: false, viewer: false });
  });
});
