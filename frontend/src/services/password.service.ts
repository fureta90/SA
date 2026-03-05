import api from './api'

export const PasswordService = {
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return response.data
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message ||
        'Error al solicitar recuperación de contraseña'
      )
    }
  },

  async resetPasswordConfirm(resetToken: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await api.post('/auth/reset-password-confirm', {
        resetToken,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message ||
        'Error al confirmar el restablecimiento de contraseña'
      );
    }
  },
}
