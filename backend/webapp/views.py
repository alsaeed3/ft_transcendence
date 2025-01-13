from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.models import User, auth
from django.contrib import messages
# from .models import Feature

# Create your views here.
def home(request):
	return render(request, 'home.html')

def register(request):
	if request.method == 'POST':
		username = request.POST['username']
		email = request.POST['email']
		password = request.POST['password']
		confirm_password = request.POST['confirm_password']

		if password == confirm_password:
			if User.objects.filter(email=email).exists():
				messages.info(request, 'Email already used')
				return redirect('register')
			elif User.objects.filter(username=username).exists():
				messages.info(request, 'Username Already Used')
				return redirect('register')
			else:
				user = User.objects.create_user(username=username, email=email, password=password)
				user.save()
				return redirect('login')
		else:
			messages.info(request, 'Passwords not matching')
			return redirect('register')
	else:
		return render(request, 'register.html')

def login(request):
	if request.method == 'POST':
		username = request.POST['username']
		password = request.POST['password']

		user = auth.authenticate(username=username, password=password)

		if user is not None:
			auth.login(request, user)
			return redirect('dashboard')
		else:
			messages.info(request, 'Credentials Invalid')
			return redirect('login')
	else:
		return render(request, 'login.html')

def logout(request):
	auth.logout(request)
	return redirect('/')

def dashboard(request):
	return render(request, 'dashboard.html', {'user': request.user})

def pong(request):
	return render(request, 'pong.html')