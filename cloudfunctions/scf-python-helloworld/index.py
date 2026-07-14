# -*- coding: utf8 -*-
import json
def main(event, context):
    print("Received event: " + json.dumps(event, indent = 2)) 
    print("Received context: " + str(context))
    print("Hello world")
    return("Hello World")