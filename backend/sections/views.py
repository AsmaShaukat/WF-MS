from django.shortcuts import render
from .models import Sections  # Assuming you have a Sections model defined
from django.http import JsonResponse
# Create your views here.
class SectionsView:
    def get_sections(request):
        sections = Sections.objects.all()
        sections_list = list(sections.values('id', 'name'))
        return JsonResponse(sections_list, safe=False)