from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # 🔐 ADD THESE
        token["role"] = user.role
        token["branch"] = user.branch
        token["username"] = user.username

        return token
