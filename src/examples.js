// REPY 예제 코드 모음
export const EXAMPLES = {
  jump_game: {
    title: '장애물 점프 게임',
    description: '스페이스바로 점프하여 날아오는 장애물을 피하는 게임입니다.',
    code: `# [REPY] 장애물 점프 게임
project(name="REPY 점프 게임", speed=60)

score = 0
is_jumping = False

object "플레이어"(shape=circle(24, '#2563eb'), x=-140, y=-60):
    when run:
        score = 0
        is_jumping = False
        goto(-140, -60)
        say("스페이스바를 눌러 점프하세요!")

    when key("space"):
        if not is_jumping:
            is_jumping = True
            # 점프 상승
            for i in range(12):
                move_y(10)
                wait(0.02)
            # 점프 하강
            for i in range(12):
                move_y(-10)
                wait(0.02)
            is_jumping = False

object "장애물"(shape=rect(30, 40, '#ef4444'), x=240, y=-60):
    when run:
        hide()
        while True:
            wait(random(1.2, 2.5))
            create_clone("self")

    when clone:
        show()
        goto(240, -60)
        while x > -250:
            move_x(-8)
            wait(0.02)
            if touch("플레이어"):
                say("게임 오버!")
                stop("all")
        score += 10
        delete_clone()

textbox "점수판"(text="점수: 0", font_size=18, color='#ffffff', bg='#1e293b', x=180, y=110):
    when run:
        while True:
            write(f"점수: {score}")
            wait(0.1)
`,
  },

  bounce_ball: {
    title: '벽 튕기는 공',
    description: '벽에 부딪히면 튕기며 색상이 바뀌는 공 예제입니다.',
    code: `# [REPY] 튕기는 공
project(name="바운스 볼", speed=60)

bounce_count = 0

object "공"(shape=circle(20, '#10b981'), x=0, y=0):
    when run:
        bounce_count = 0
        goto(0, 0)
        rotate_to(random(30, 150))
        while True:
            move(12)
            if touch("wall"):
                bounce()
                bounce_count += 1
                add_effect("color", 25)

textbox "카운터"(text="튕긴 횟수: 0", font_size=20, color='#111827', bg='#f3f4f6', x=0, y=110):
    when run:
        while True:
            write(f"튕긴 횟수: {bounce_count}회")
            wait(0.1)
`,
  },

  pen_art: {
    title: '붓(Brush) 기하학 아트',
    description: '엔트리의 붓 기능을 사용하여 기하학 나선 패턴을 그립니다.',
    code: `# [REPY] 붓 기하학 패턴
project(name="REPY 브러시 아트", speed=60)

object "펜"(shape=circle(6, '#ec4899'), x=0, y=0):
    when run:
        clear_drawing()
        goto(0, 0)
        set_pen_size(3)
        set_pen_color('#ec4899')
        start_drawing()
        
        step = 4
        for i in range(70):
            move(step)
            turn(89)
            step += 3
            wait(0.02)
            
        stop_drawing()
        say("완성!")
`,
  },

  multiscene: {
    title: '다중 장면 & 함수 전환',
    description: 'scene 구문과 사용자 정의 함수를 사용한 메뉴 전환 예제입니다.',
    code: `# [REPY] 다중 씬 & 함수 예제
project(name="씬 전환 게임")

gold = 100

def give_reward(n):
    global gold
    gold += n

scene "타이틀":
    textbox "메뉴제목"(text="엔트리 REPY 타이틀", font_size=24, color='#ffffff', bg='#0f172a', x=0, y=60)
    
    object "시작버튼"(shape=rect(140, 45, '#3b82f6'), x=0, y=-30):
        when click:
            start_scene("게임화면")

scene "게임화면":
    object "보물상자"(shape=star(36, '#f59e0b'), x=0, y=0):
        when scene_start:
            say("상자를 클릭하세요!")
        when click:
            give_reward(50)
            say(f"보상 획득! 현재 골드: {gold}")
`,
  },
};
