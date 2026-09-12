import urllib.request, json
resp = urllib.request.urlopen("http://localhost:5000/api/sync")
d = json.loads(resp.read())
print("tokens:", len(d.get("tokens", [])))
print("appointments:", len(d.get("appointments", [])))
print("hospitals:", len(d.get("hospitals", [])))
