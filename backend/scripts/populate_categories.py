import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.items.models import ItemCategory

def populate_categories():
    categories = [
        {'name': 'Electronics', 'icon': 'devices', 'description': 'Phones, Laptops, Chargers, etc.'},
        {'name': 'Keys & Wallets', 'icon': 'vpn_key', 'description': 'Keyrings, Purses, Wallets'},
        {'name': 'Clothing & Gear', 'icon': 'apparel', 'description': 'Jackets, Bags, Watches, Accessories'},
        {'name': 'IDs & Documents', 'icon': 'badge', 'description': 'Student IDs, National IDs, Passports, Notebooks'},
        {'name': 'Other', 'icon': 'more_horiz', 'description': 'Miscellaneous items'},
    ]

    for cat_data in categories:
        cat, created = ItemCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={'icon': cat_data['icon'], 'description': cat_data['description']}
        )
        if created:
            print(f"Created category: {cat.name}")
        else:
            print(f"Category already exists: {cat.name}")

if __name__ == '__main__':
    populate_categories()
