from rest_framework.permissions import BasePermission


class IsRole(BasePermission):
    role = None

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == self.role)


class IsFarmer(IsRole):
    role = 'farmer'


class IsBuyer(IsRole):
    role = 'buyer'


class IsLogistics(IsRole):
    role = 'logistics'
