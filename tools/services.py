import fire
import requests
import config

def check_service(service):
    try:
        r = requests.get(service[1] + '/status')

        if r.status_code == 200:
            print(f"😃 {service[0]}: {r.json()['state']}.")
        else:
            print(f"😢 {service[0]}: unavailable ({r.status_code}).")
            
    except:
        print(f"😢 {service[0]}: unavailable (timeout/comm error).")

def get_service(service_name):
    s_array = False
    for service in config.services:
        if service[0] == service_name:
            s_array = service
    
    return s_array

class Commands:
    def check(self, service="all"):
        """Check a/all service statuses"""
        if service == "all":
            for ser in config.services:
                check_service(ser)
        
        else:
            s = get_service(service)
            if s:
                check_service(s)
            else:
                print(f"❌ Service not found: {service}")

if __name__ == "__main__":
    fire.Fire(Commands)