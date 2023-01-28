from collections import namedtuple
from os import getenv
from time import sleep
from dotenv import load_dotenv
import re
from discord_webhook import DiscordWebhook, DiscordEmbed
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


load_dotenv()

LOGIN_URL = "https://studentportal.inholland.nl/"
USERNAME_XPATH = "/html/body/section[7]/div[3]/div/div[2]/div[2]/div[2]/div[1]/form/div[2]/div[2]/input"
PASSWORD_XPATH = "/html/body/section[7]/div[3]/div/div[2]/div[2]/div[2]/div[1]/form/div[3]/div[2]/input"
LOGON_BUTTON_XPATH = "/html/body/section[7]/div[3]/div/div[2]/div[2]/div[2]/div[1]/form/div[5]/div[1]/a"
STUDY_XPATH = "/html/body/form/div[2]/div[4]/div[2]/div/div/div/div/div[4]/section/div/div[3]/div[3]/div/div[3]/div/div[2]/div/div/div/div[3]/div[1]/div"
GRADERESULTS_XPATH = "/html/body/form/div[2]/div[4]/div[1]/div/div[2]/div[1]/div/div/div/div[2]/div[2]/div/div[2]/div/ul/li[4]/div[2]/div"
TABLE_XPATH = "/html/body/form/div[2]/div[4]/div[2]/div/div/div/div/div/div/div[1]/div/div[2]/div/div/table"

previousCourses = []


def wait_for_load(driver, inputXPath):
    Wait = WebDriverWait(driver, 10)
    Wait.until(EC.presence_of_element_located((By.XPATH, inputXPath)))


def run():
    driver = webdriver.Chrome()
    driver.get(LOGIN_URL)

    wait_for_load(driver, USERNAME_XPATH)
    input_username_element = driver.find_element(By.XPATH, USERNAME_XPATH)
    input_username_element.clear()
    input_username_element.send_keys(getenv("USERNAME"))

    input_password_element = driver.find_element(By.XPATH, PASSWORD_XPATH)
    input_password_element.clear()
    input_password_element.send_keys(getenv("PASSWORD"))

    logon_button_element = driver.find_element(By.XPATH, LOGON_BUTTON_XPATH)
    logon_button_element.click()

    wait_for_load(driver, STUDY_XPATH)
    study_element = driver.find_element(By.XPATH, STUDY_XPATH)
    study_element.click()

    wait_for_load(driver, GRADERESULTS_XPATH)
    sleep(1)
    graderesults_element = driver.find_element(By.XPATH, GRADERESULTS_XPATH)
    graderesults_element.click()

    wait_for_load(driver, TABLE_XPATH)
    table = driver.find_element(
        By.XPATH, TABLE_XPATH).get_attribute("outerHTML")
    driver.close()

    courses = get_courses(table)
    if courses != previousCourses:
        print("New courses found!")
        print(courses)
        send_message_to_discord(courses[0])
    previousCourses = courses


def get_course_names_from_table(table):
    course_names = []
    regex = r"\"CRSE_CATALOG_DESCR.*\"\>(.*)\<"

    matches = re.finditer(regex, table, re.MULTILINE)
    for matchNum, match in enumerate(matches, start=1):
        print("Match {matchNum} was found at {start}-{end}: {match}".format(
            matchNum=matchNum, start=match.start(), end=match.end(), match=match.group()))

        for groupNum in range(0, len(match.groups())):
            groupNum = groupNum + 1
            print("Group {groupNum} found at {start}-{end}: {group}".format(groupNum=groupNum,
                                                                            start=match.start(groupNum), end=match.end(groupNum), group=match.group(groupNum)))
            course_names.append(match.group(groupNum))
    return course_names


def get_test_codes_from_table(table):
    test_codes = []
    regex = r"\"IH_PT_RES_VW_CATALOG_NBR.*\"\>(.*)\<"

    matches = re.finditer(regex, table, re.MULTILINE)
    for matchNum, match in enumerate(matches, start=1):
        print("Match {matchNum} was found at {start}-{end}: {match}".format(
            matchNum=matchNum, start=match.start(), end=match.end(), match=match.group()))

        for groupNum in range(0, len(match.groups())):
            groupNum = groupNum + 1
            print("Group {groupNum} found at {start}-{end}: {group}".format(groupNum=groupNum,
                                                                            start=match.start(groupNum), end=match.end(groupNum), group=match.group(groupNum)))
            test_codes.append(match.group(groupNum))
    return test_codes


def get_dates_from_table(table):
    dates = []
    regex = r"\"IH_PT_RES_VW_GRADE_DT.*\"\>(.*)\<"

    matches = re.finditer(regex, table, re.MULTILINE)
    for matchNum, match in enumerate(matches, start=1):
        print("Match {matchNum} was found at {start}-{end}: {match}".format(
            matchNum=matchNum, start=match.start(), end=match.end(), match=match.group()))

        for groupNum in range(0, len(match.groups())):
            groupNum = groupNum + 1
            print("Group {groupNum} found at {start}-{end}: {group}".format(groupNum=groupNum,
                                                                            start=match.start(groupNum), end=match.end(groupNum), group=match.group(groupNum)))
            dates.append(match.group(groupNum))
    return dates


def get_grades_from_table(table):
    grades = []
    regex = r"\"IH_PT_RES_VW_CRSE_GRADE_OFF.*\"\>(.*)\<"

    matches = re.finditer(regex, table, re.MULTILINE)
    for matchNum, match in enumerate(matches, start=1):
        print("Match {matchNum} was found at {start}-{end}: {match}".format(
            matchNum=matchNum, start=match.start(), end=match.end(), match=match.group()))

        for groupNum in range(0, len(match.groups())):
            groupNum = groupNum + 1
            print("Group {groupNum} found at {start}-{end}: {group}".format(groupNum=groupNum,
                                                                            start=match.start(groupNum), end=match.end(groupNum), group=match.group(groupNum)))
            if "&nbsp;" not in match.group(groupNum):
                grades.append(match.group(groupNum))
    return grades


def get_courses(table):
    course_names = get_course_names_from_table(table)
    test_codes = get_test_codes_from_table(table)
    dates = get_dates_from_table(table)
    grades = get_grades_from_table(table)

    courses = []
    Course = namedtuple("Course", "course_name test_code date grade")
    for i in range(len(course_names)):
        courses.append(
            Course(course_names[i], test_codes[i], dates[i], grades[i])._asdict())
    return courses


def send_message_to_discord(course):
    webhook = DiscordWebhook(url=getenv("DISCORD_WEBHOOK_URL"))
    embed = DiscordEmbed(title='New Grade!',
                         description='New grade has been posted!', color=242424)
    embed.add_embed_field(name=course["course_name"], value="Test Code: " + course["test_code"] +
                          "\nDate: " + course["date"] + "\nGrade: " + course["grade"])
    webhook.add_embed(embed)
    reponse = webhook.execute()

    if reponse.status_code != 204:
        print("Error sending message to discord")


if __name__ == "__main__":
    while True:
        try:
            run()
        except Exception as e:
            print(e)
            print("Error getting grades. Retrying in 5 minutes...")
        sleep(300)
